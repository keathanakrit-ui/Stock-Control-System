begin;

create table public.stock_notification_states (
  product_id bigint not null references public.products(id) on delete cascade,
  condition text not null check (condition in ('LOW_STOCK', 'OVER_STOCK', 'NON_MOVEMENT')),
  active boolean not null default false,
  last_sent_at timestamptz null,
  last_attempt_at timestamptz null,
  claim_token uuid null,
  claim_expires_at timestamptz null,
  last_error text null,
  updated_at timestamptz not null default now(),
  primary key (product_id, condition)
);

comment on table public.stock_notification_states is
  'Server-only deduplication, cooldown, and delivery-lease state for stock LINE notifications.';

alter table public.stock_notification_states enable row level security;
revoke all on table public.stock_notification_states from public, anon, authenticated;
grant select, insert, update on table public.stock_notification_states to service_role;

-- The summary is security-invoker and STEP 26 explicitly revoked service_role,
-- so the server-only engine needs SELECT on both the view and its base tables.
grant select on table public.products to service_role;
grant select on table public.stock_transactions to service_role;
grant select on table public.product_stock_summary to service_role;

create function public.claim_stock_notification(
  p_product_id bigint,
  p_condition text,
  p_is_active boolean,
  p_cooldown_hours integer default 24,
  p_retry_minutes integer default 15
)
returns table (should_send boolean, claim_token uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state public.stock_notification_states%rowtype;
  v_now timestamptz := pg_catalog.now();
  v_claim_token uuid;
begin
  if p_condition not in ('LOW_STOCK', 'OVER_STOCK', 'NON_MOVEMENT') then
    raise exception using errcode = '22023', message = 'INVALID_NOTIFICATION_CONDITION';
  end if;
  if p_cooldown_hours < 1 or p_retry_minutes < 1 then
    raise exception using errcode = '22023', message = 'INVALID_NOTIFICATION_INTERVAL';
  end if;

  -- Serialize the initial insert as well as later claims for this exact key.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_product_id::text || ':' || p_condition, 0)
  );

  select * into v_state
  from public.stock_notification_states
  where product_id = p_product_id and condition = p_condition
  for update;

  if not p_is_active then
    if found then
      update public.stock_notification_states
      set active = false, claim_token = null, claim_expires_at = null,
          last_error = null, updated_at = v_now
      where product_id = p_product_id and condition = p_condition;
    end if;
    return query select false, null::uuid;
    return;
  end if;

  if not found then
    v_claim_token := pg_catalog.gen_random_uuid();
    insert into public.stock_notification_states (
      product_id, condition, active, last_attempt_at, claim_token,
      claim_expires_at, updated_at
    ) values (
      p_product_id, p_condition, true, v_now, v_claim_token,
      v_now + interval '5 minutes', v_now
    );
    return query select true, v_claim_token;
    return;
  end if;

  if v_state.claim_expires_at is not null and v_state.claim_expires_at > v_now then
    return query select false, null::uuid;
    return;
  end if;

  if v_state.active
     and v_state.last_sent_at is not null
     and v_state.last_sent_at > v_now - (p_cooldown_hours * interval '1 hour') then
    return query select false, null::uuid;
    return;
  end if;

  if v_state.last_error is not null
     and v_state.last_attempt_at is not null
     and v_state.last_attempt_at > v_now - (p_retry_minutes * interval '1 minute') then
    return query select false, null::uuid;
    return;
  end if;

  v_claim_token := pg_catalog.gen_random_uuid();
  update public.stock_notification_states
  set active = true, last_attempt_at = v_now, claim_token = v_claim_token,
      claim_expires_at = v_now + interval '5 minutes', updated_at = v_now
  where product_id = p_product_id and condition = p_condition;

  return query select true, v_claim_token;
end;
$$;

create function public.finalize_stock_notification(
  p_product_id bigint,
  p_condition text,
  p_claim_token uuid,
  p_success boolean,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  update public.stock_notification_states
  set last_sent_at = case when p_success then pg_catalog.now() else last_sent_at end,
      last_error = case when p_success then null else pg_catalog.left(coalesce(p_error, 'Unknown delivery error'), 1000) end,
      claim_token = null,
      claim_expires_at = null,
      updated_at = pg_catalog.now()
  where product_id = p_product_id
    and condition = p_condition
    and claim_token = p_claim_token;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.claim_stock_notification(bigint, text, boolean, integer, integer)
  from public, anon, authenticated;
revoke all on function public.finalize_stock_notification(bigint, text, uuid, boolean, text)
  from public, anon, authenticated;
grant execute on function public.claim_stock_notification(bigint, text, boolean, integer, integer)
  to service_role;
grant execute on function public.finalize_stock_notification(bigint, text, uuid, boolean, text)
  to service_role;

commit;
