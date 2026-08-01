begin;

-- =============================================================================
-- 1. Convert Product thresholds to numeric(14,3)
-- =============================================================================
--
-- numeric(14,3):
--   14 total digits
--   3 fractional digits
--   11 integer digits
--   maximum positive value: 99,999,999,999.999
--
-- Existing bigint values convert exactly when they fit within this range.

do $$
begin
  if exists (
    select 1
    from public.products
    where
      (
        min_qty is not null
        and abs(min_qty::numeric) > 99999999999.999
      )
      or
      (
        max_qty is not null
        and abs(max_qty::numeric) > 99999999999.999
      )
  ) then
    raise exception
      'Cannot convert products.min_qty/max_qty to numeric(14,3): an existing value exceeds 99,999,999,999.999.';
  end if;
end;
$$;

alter table public.products
  alter column min_qty type numeric(14,3)
    using min_qty::numeric(14,3),
  alter column max_qty type numeric(14,3)
    using max_qty::numeric(14,3);

comment on column public.products.min_qty is
  'Low-stock threshold supporting fractional quantities. Current stock is not stored here.';

comment on column public.products.max_qty is
  'Over-stock threshold supporting fractional quantities. Current stock is not stored here.';


-- =============================================================================
-- 2. Append-only stock transaction ledger
-- =============================================================================

create table public.stock_transactions (
  id bigint generated always as identity primary key,

  product_id bigint not null,

  transaction_type text not null,

  quantity numeric(14,3) not null,

  transaction_at timestamptz not null default now(),

  performed_by_user_id uuid null,

  performed_by_label text not null default 'Development User',

  reference text null,
  note text null,
  reason text null,

  created_at timestamptz not null default now(),

  constraint stock_transactions_product_fk
    foreign key (product_id)
    references public.products(id)
    on update restrict
    on delete restrict,

  constraint stock_transactions_performed_by_user_fk
    foreign key (performed_by_user_id)
    references auth.users(id)
    on update restrict
    on delete set null,

  constraint stock_transactions_type_check
    check (
      transaction_type in (
        'RECEIVE',
        'ISSUE',
        'ADJUSTMENT_IN',
        'ADJUSTMENT_OUT'
      )
    ),

  constraint stock_transactions_quantity_positive_check
    check (quantity > 0),

  constraint stock_transactions_performed_by_label_check
    check (btrim(performed_by_label) <> ''),

  constraint stock_transactions_adjustment_reason_check
    check (
      transaction_type not in ('ADJUSTMENT_IN', 'ADJUSTMENT_OUT')
      or (
        reason is not null
        and btrim(reason) <> ''
      )
    )
);

comment on table public.stock_transactions is
  'Immutable stock movement ledger. Current stock is derived from these rows and is not stored in products.';

comment on column public.stock_transactions.transaction_type is
  'Movement direction. The Phase 2 RPC accepts RECEIVE and ISSUE only; adjustment types are reserved for a future authorized workflow.';

comment on column public.stock_transactions.quantity is
  'Positive movement quantity with up to three decimal places. Transaction type determines whether stock increases or decreases.';

comment on column public.stock_transactions.transaction_at is
  'Server-generated effective transaction timestamp for the Phase 2 workflow.';

comment on column public.stock_transactions.performed_by_user_id is
  'Future Supabase Auth actor. Null during anonymous development access.';

comment on column public.stock_transactions.performed_by_label is
  'Immutable display snapshot of the actor at transaction time.';

comment on column public.stock_transactions.reason is
  'Required for future stock adjustment transactions.';


-- =============================================================================
-- 3. Ledger indexes
-- =============================================================================

create index stock_transactions_product_date_idx
  on public.stock_transactions (product_id, transaction_at desc);

create index stock_transactions_date_idx
  on public.stock_transactions (transaction_at desc);

create index stock_transactions_type_date_idx
  on public.stock_transactions (transaction_type, transaction_at desc);

create index stock_transactions_actor_date_idx
  on public.stock_transactions (performed_by_user_id, transaction_at desc);


-- =============================================================================
-- 4. Append-only Row Level Security
-- =============================================================================
--
-- Anonymous development clients may read transaction history.
--
-- No application role receives direct INSERT, UPDATE, DELETE, or sequence
-- privileges. All movement creation must use create_stock_transaction().
--
-- Dashboard/SQL Editor administrators continue to operate through their owning
-- or administrative database role.

alter table public.stock_transactions enable row level security;

revoke all on table public.stock_transactions from public;
revoke all on table public.stock_transactions from anon;
revoke all on table public.stock_transactions from authenticated;
revoke all on table public.stock_transactions from service_role;

revoke all on sequence public.stock_transactions_id_seq from public;
revoke all on sequence public.stock_transactions_id_seq from anon;
revoke all on sequence public.stock_transactions_id_seq from authenticated;
revoke all on sequence public.stock_transactions_id_seq from service_role;

grant select on table public.stock_transactions to anon;

create policy "Allow anon read stock transactions"
  on public.stock_transactions
  for select
  to anon
  using (true);

comment on policy "Allow anon read stock transactions"
  on public.stock_transactions is
  'Temporary development policy. Remove anonymous access when Supabase Auth is implemented.';

-- Intentionally absent:
--   INSERT policy
--   UPDATE policy
--   DELETE policy
--
-- This makes the ledger append-only for application-facing roles.


-- =============================================================================
-- 5. Derived Product stock summary
-- =============================================================================
--
-- security_invoker means the caller must have access to the underlying products
-- and stock_transactions rows.
--
-- The existing products anon SELECT policy remains in effect.
-- The explicit products SELECT grant below ensures the required table privilege
-- exists for the security-invoker view.
--
-- Products without transactions receive current_qty = 0.

grant select on table public.products to anon;

create view public.product_stock_summary
with (security_invoker = true)
as
select
  p.id as product_id,
  p.product_code,
  p.product_name,
  p.category,
  p.unit,
  p.min_qty,
  p.max_qty,

  coalesce(
    sum(
      case
        when st.transaction_type in ('RECEIVE', 'ADJUSTMENT_IN')
          then st.quantity
        when st.transaction_type in ('ISSUE', 'ADJUSTMENT_OUT')
          then -st.quantity
        else 0::numeric
      end
    ),
    0::numeric
  ) as current_qty,

  max(st.transaction_at) as last_movement_at

from public.products as p
left join public.stock_transactions as st
  on st.product_id = p.id

group by
  p.id,
  p.product_code,
  p.product_name,
  p.category,
  p.unit,
  p.min_qty,
  p.max_qty;

comment on view public.product_stock_summary is
  'Derived Product balance and last movement time. Current quantity is not persisted in products.';

revoke all on table public.product_stock_summary from public;
revoke all on table public.product_stock_summary from anon;
revoke all on table public.product_stock_summary from authenticated;
revoke all on table public.product_stock_summary from service_role;

grant select on table public.product_stock_summary to anon;


-- =============================================================================
-- 6. Atomic Receive/Issue RPC
-- =============================================================================
--
-- SECURITY DEFINER is required because anon has no direct INSERT or sequence
-- privileges.
--
-- Security-sensitive properties:
--
-- 1. search_path is empty.
-- 2. Every database relation is schema-qualified.
-- 3. COALESCE and NULLIF are SQL expressions and need no schema lookup.
-- 4. Other named built-ins are explicitly qualified with pg_catalog.
-- 5. Built-in operators resolve from implicitly trusted pg_catalog.
-- 6. Client input cannot select the actor.
-- 7. Only RECEIVE and ISSUE are accepted.
-- 8. Both operations lock the same Product row before calculating stock.
-- 9. Stock validation and insertion occur in one transaction.
--
-- p_quantity remains unconstrained numeric intentionally. This allows the
-- function to inspect scale and reject values with more than three fractional
-- digits before assigning to numeric(14,3).

create function public.create_stock_transaction(
  p_product_id bigint,
  p_transaction_type text,
  p_quantity numeric,
  p_reference text default null,
  p_note text default null
)
returns table (
  transaction_id bigint,
  current_qty numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transaction_type text;
  v_quantity numeric(14,3);
  v_current_qty numeric;
  v_transaction_id bigint;
begin
  v_transaction_type :=
    pg_catalog.upper(
      pg_catalog.btrim(
        coalesce(p_transaction_type, '')
      )
    );

  if v_transaction_type not in ('RECEIVE', 'ISSUE') then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_TRANSACTION_TYPE',
      detail = 'Phase 2 accepts RECEIVE or ISSUE only.';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_QUANTITY',
      detail = 'Quantity must be greater than zero.';
  end if;

  -- Explicitly reject values containing more than three fractional digits.
  -- Keeping p_quantity as unconstrained numeric prevents typmod coercion from
  -- silently rounding the input before this validation.
  if pg_catalog.scale(p_quantity) > 3 then
    raise exception using
      errcode = 'P0001',
      message = 'QUANTITY_SCALE_EXCEEDED',
      detail = 'Quantity may contain at most three decimal places.';
  end if;

  if p_quantity > 99999999999.999 then
    raise exception using
      errcode = 'P0001',
      message = 'QUANTITY_OUT_OF_RANGE',
      detail = 'Quantity exceeds the numeric(14,3) maximum of 99,999,999,999.999.';
  end if;

  v_quantity := p_quantity::numeric(14,3);

  -- Lock the Product row before calculating availability.
  --
  -- Every Receive and Issue call for this Product must acquire this lock.
  -- A second same-product call waits until the first transaction completes.
  perform p.id
  from public.products as p
  where p.id = p_product_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'PRODUCT_NOT_FOUND',
      detail = 'The selected product does not exist.';
  end if;

  -- Calculate authoritative stock only after the Product lock is held.
  select
    coalesce(
      pg_catalog.sum(
        case
          when st.transaction_type in ('RECEIVE', 'ADJUSTMENT_IN')
            then st.quantity
          when st.transaction_type in ('ISSUE', 'ADJUSTMENT_OUT')
            then -st.quantity
          else 0::numeric
        end
      ),
      0::numeric
    )
  into v_current_qty
  from public.stock_transactions as st
  where st.product_id = p_product_id;

  if
    v_transaction_type = 'ISSUE'
    and v_quantity > v_current_qty
  then
    raise exception using
      errcode = 'P0001',
      message = 'INSUFFICIENT_STOCK',
      detail = pg_catalog.format(
        'Available stock is %s; requested issue quantity is %s.',
        v_current_qty,
        v_quantity
      );
  end if;

  insert into public.stock_transactions (
    product_id,
    transaction_type,
    quantity,
    performed_by_user_id,
    performed_by_label,
    reference,
    note
  )
  values (
    p_product_id,
    v_transaction_type,
    v_quantity,
    null,
    'Development User',
    nullif(pg_catalog.btrim(p_reference), ''),
    nullif(pg_catalog.btrim(p_note), '')
  )
  returning id
  into v_transaction_id;

  if v_transaction_type = 'RECEIVE' then
    v_current_qty := v_current_qty + v_quantity;
  else
    v_current_qty := v_current_qty - v_quantity;
  end if;

  return query
  select
    v_transaction_id,
    v_current_qty;
end;
$$;

comment on function public.create_stock_transaction(
  bigint,
  text,
  numeric,
  text,
  text
) is
  'Atomic development RPC for RECEIVE and ISSUE. Uses a per-product row lock and rejects Issues exceeding derived stock.';


-- =============================================================================
-- 7. Explicit RPC privileges
-- =============================================================================
--
-- PostgreSQL normally grants EXECUTE on a new function to PUBLIC.
-- Supabase default privileges may also grant application roles access.
--
-- Revoke every application-facing role first, then grant only anon.
-- Because all of this occurs before COMMIT, there is no externally visible
-- interval in which PUBLIC can execute the SECURITY DEFINER function.

revoke all on function public.create_stock_transaction(
  bigint,
  text,
  numeric,
  text,
  text
) from public;

revoke all on function public.create_stock_transaction(
  bigint,
  text,
  numeric,
  text,
  text
) from anon;

revoke all on function public.create_stock_transaction(
  bigint,
  text,
  numeric,
  text,
  text
) from authenticated;

revoke all on function public.create_stock_transaction(
  bigint,
  text,
  numeric,
  text,
  text
) from service_role;

grant execute on function public.create_stock_transaction(
  bigint,
  text,
  numeric,
  text,
  text
) to anon;

commit;
