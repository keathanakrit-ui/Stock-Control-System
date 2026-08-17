begin;

create or replace function public.create_stock_transaction(
  p_product_id bigint,
  p_transaction_type text,
  p_quantity numeric,
  p_reference text default null,
  p_note text default null
) returns table(transaction_id bigint, current_qty numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_label text;
  v_type text;
  v_qty numeric(14,3);
  v_current numeric;
  v_id bigint;
begin
  if v_uid is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  v_type := pg_catalog.upper(pg_catalog.btrim(coalesce(p_transaction_type, '')));
  if v_type not in ('RECEIVE', 'ISSUE') then
    raise exception using errcode = 'P0001', message = 'INVALID_TRANSACTION_TYPE';
  end if;

  if v_type = 'RECEIVE' and not public.has_app_role(array['SUPER_ADMIN', 'ADMIN', 'STORE']) then
    raise exception using errcode = '42501', message = 'STOCK_TRANSACTION_FORBIDDEN';
  end if;
  if v_type = 'ISSUE' and not public.has_app_role(array['SUPER_ADMIN', 'ADMIN', 'STORE', 'USER']) then
    raise exception using errcode = '42501', message = 'STOCK_TRANSACTION_FORBIDDEN';
  end if;

  select coalesce(
    nullif(pg_catalog.btrim(p.full_name), ''),
    nullif(pg_catalog.btrim(u.email), ''),
    'Authenticated User'
  )
  into v_label
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.id = v_uid;

  if v_label is null then
    raise exception using errcode = '42501', message = 'ACTIVE_PROFILE_REQUIRED';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_QUANTITY';
  end if;
  if pg_catalog.scale(p_quantity) > 3 then
    raise exception using errcode = 'P0001', message = 'QUANTITY_SCALE_EXCEEDED';
  end if;
  if p_quantity > 99999999999.999 then
    raise exception using errcode = 'P0001', message = 'QUANTITY_OUT_OF_RANGE';
  end if;

  v_qty := p_quantity::numeric(14,3);
  perform p.id from public.products p where p.id = p_product_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'PRODUCT_NOT_FOUND';
  end if;

  select coalesce(pg_catalog.sum(
    case
      when transaction_type in ('RECEIVE', 'ADJUSTMENT_IN') then quantity
      when transaction_type in ('ISSUE', 'ADJUSTMENT_OUT') then -quantity
      else 0
    end
  ), 0)
  into v_current
  from public.stock_transactions
  where product_id = p_product_id;

  if v_type = 'ISSUE' and v_qty > v_current then
    raise exception using
      errcode = 'P0001',
      message = 'INSUFFICIENT_STOCK',
      detail = pg_catalog.format(
        'Available stock is %s; requested issue quantity is %s.',
        v_current,
        v_qty
      );
  end if;

  insert into public.stock_transactions(
    product_id,
    transaction_type,
    quantity,
    performed_by_user_id,
    performed_by_label,
    reference,
    note
  ) values (
    p_product_id,
    v_type,
    v_qty,
    v_uid,
    v_label,
    nullif(pg_catalog.btrim(p_reference), ''),
    nullif(pg_catalog.btrim(p_note), '')
  ) returning id into v_id;

  if v_type = 'RECEIVE' then
    v_current := v_current + v_qty;
  else
    v_current := v_current - v_qty;
  end if;

  return query select v_id, v_current;
end
$$;

revoke all on function public.create_stock_transaction(bigint,text,numeric,text,text)
from public, anon, authenticated;
grant execute on function public.create_stock_transaction(bigint,text,numeric,text,text)
to authenticated;

comment on function public.create_stock_transaction(bigint,text,numeric,text,text) is
'Atomic role-authorized stock movement: active USER may ISSUE; STORE, ADMIN, and SUPER_ADMIN may RECEIVE or ISSUE.';

commit;
