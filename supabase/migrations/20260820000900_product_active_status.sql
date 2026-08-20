begin;

alter table public.products
  add column if not exists active boolean not null default true;

comment on column public.products.active is
  'Inactive products remain available for history but cannot receive or issue stock.';

create or replace view public.product_stock_summary
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
        when st.transaction_type in ('RECEIVE', 'ADJUSTMENT_IN') then st.quantity
        when st.transaction_type in ('ISSUE', 'ADJUSTMENT_OUT') then -st.quantity
        else 0::numeric
      end
    ),
    0::numeric
  ) as current_qty,
  max(st.transaction_at) as last_movement_at,
  p.active
from public.products as p
left join public.stock_transactions as st on st.product_id = p.id
group by
  p.id,
  p.product_code,
  p.product_name,
  p.category,
  p.unit,
  p.min_qty,
  p.max_qty,
  p.active;

create or replace function public.prevent_inactive_product_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.products as p
    where p.id = new.product_id
      and p.active
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'PRODUCT_INACTIVE';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_inactive_product_transaction
  on public.stock_transactions;
create trigger prevent_inactive_product_transaction
before insert on public.stock_transactions
for each row execute function public.prevent_inactive_product_transaction();

revoke all on function public.prevent_inactive_product_transaction() from public;

commit;
