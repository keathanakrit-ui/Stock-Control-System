begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text null,
  role text not null default 'USER' check (role in ('SUPER_ADMIN','ADMIN','STORE','USER')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (full_name is null or btrim(full_name) <> '')
);
alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, role, active) on public.profiles to authenticated;

create function public.set_profile_updated_at() returns trigger language plpgsql
set search_path = '' as $$ begin new.updated_at := pg_catalog.now(); return new; end $$;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_profile_updated_at();

create function public.handle_new_auth_user() returns trigger language plpgsql security definer
set search_path = '' as $$ begin
  insert into public.profiles(id, role, active) values(new.id, 'USER', true)
  on conflict(id) do nothing; return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Deliberately backfill every existing user as USER; nobody is auto-promoted.
insert into public.profiles(id, role, active)
select id, 'USER', true from auth.users on conflict(id) do nothing;

create function public.current_app_role() returns text language sql stable security definer
set search_path = '' as $$ select role from public.profiles where id=auth.uid() and active $$;
create function public.is_active_user() returns boolean language sql stable security definer
set search_path = '' as $$ select exists(select 1 from public.profiles where id=auth.uid() and active) $$;
create function public.has_app_role(p_roles text[]) returns boolean language sql stable security definer
set search_path = '' as $$ select exists(select 1 from public.profiles where id=auth.uid() and active and role=any(p_roles)) $$;

revoke all on function public.set_profile_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.current_app_role() from public, anon, authenticated;
revoke all on function public.is_active_user() from public, anon, authenticated;
revoke all on function public.has_app_role(text[]) from public, anon, authenticated;
grant execute on function public.current_app_role(), public.is_active_user(), public.has_app_role(text[]) to authenticated;

create policy "Users read own profile" on public.profiles for select to authenticated using(id=auth.uid());
create policy "Super admins read all profiles" on public.profiles for select to authenticated
using(public.has_app_role(array['SUPER_ADMIN']));
create policy "Super admins update profiles" on public.profiles for update to authenticated
using(public.has_app_role(array['SUPER_ADMIN'])) with check(public.has_app_role(array['SUPER_ADMIN']));

drop policy if exists "Allow anon select" on public.products;
drop policy if exists "Allow anon insert" on public.products;
drop policy if exists "Allow anon update" on public.products;
drop policy if exists "Allow anon delete" on public.products;
drop policy if exists "Allow authenticated read products" on public.products;
drop policy if exists "Allow authenticated create products" on public.products;
drop policy if exists "Allow authenticated update products" on public.products;
drop policy if exists "Allow authenticated delete products" on public.products;
create policy "Active users read products" on public.products for select to authenticated using(public.is_active_user());
create policy "Admins create products" on public.products for insert to authenticated
with check(public.has_app_role(array['SUPER_ADMIN','ADMIN']));
create policy "Admins update products" on public.products for update to authenticated
using(public.has_app_role(array['SUPER_ADMIN','ADMIN'])) with check(public.has_app_role(array['SUPER_ADMIN','ADMIN']));
create policy "Admins delete products" on public.products for delete to authenticated
using(public.has_app_role(array['SUPER_ADMIN','ADMIN']));

drop policy if exists "Allow authenticated read stock transactions" on public.stock_transactions;
create policy "Active users read stock transactions" on public.stock_transactions for select to authenticated
using(public.is_active_user());

create or replace function public.create_stock_transaction(
  p_product_id bigint, p_transaction_type text, p_quantity numeric,
  p_reference text default null, p_note text default null
) returns table(transaction_id bigint,current_qty numeric) language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_label text; v_type text; v_qty numeric(14,3); v_current numeric; v_id bigint;
begin
  if v_uid is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.has_app_role(array['SUPER_ADMIN','ADMIN','STORE']) then
    raise exception using errcode='42501',message='STOCK_TRANSACTION_FORBIDDEN'; end if;
  select coalesce(nullif(pg_catalog.btrim(p.full_name),''),nullif(pg_catalog.btrim(u.email),''),'Authenticated User')
    into v_label from auth.users u join public.profiles p on p.id=u.id where u.id=v_uid;
  if v_label is null then raise exception using errcode='42501',message='ACTIVE_PROFILE_REQUIRED'; end if;
  v_type:=pg_catalog.upper(pg_catalog.btrim(coalesce(p_transaction_type,'')));
  if v_type not in ('RECEIVE','ISSUE') then raise exception using errcode='P0001',message='INVALID_TRANSACTION_TYPE'; end if;
  if p_quantity is null or p_quantity<=0 then raise exception using errcode='P0001',message='INVALID_QUANTITY'; end if;
  if pg_catalog.scale(p_quantity)>3 then raise exception using errcode='P0001',message='QUANTITY_SCALE_EXCEEDED'; end if;
  if p_quantity>99999999999.999 then raise exception using errcode='P0001',message='QUANTITY_OUT_OF_RANGE'; end if;
  v_qty:=p_quantity::numeric(14,3);
  perform p.id from public.products p where p.id=p_product_id for update;
  if not found then raise exception using errcode='P0001',message='PRODUCT_NOT_FOUND'; end if;
  select coalesce(pg_catalog.sum(case when transaction_type in ('RECEIVE','ADJUSTMENT_IN') then quantity
    when transaction_type in ('ISSUE','ADJUSTMENT_OUT') then -quantity else 0 end),0)
    into v_current from public.stock_transactions where product_id=p_product_id;
  if v_type='ISSUE' and v_qty>v_current then raise exception using errcode='P0001',message='INSUFFICIENT_STOCK',
    detail=pg_catalog.format('Available stock is %s; requested issue quantity is %s.',v_current,v_qty); end if;
  insert into public.stock_transactions(product_id,transaction_type,quantity,performed_by_user_id,performed_by_label,reference,note)
    values(p_product_id,v_type,v_qty,v_uid,v_label,nullif(pg_catalog.btrim(p_reference),''),nullif(pg_catalog.btrim(p_note),''))
    returning id into v_id;
  if v_type='RECEIVE' then v_current:=v_current+v_qty; else v_current:=v_current-v_qty; end if;
  return query select v_id,v_current;
end $$;
revoke all on function public.create_stock_transaction(bigint,text,numeric,text,text) from public,anon,authenticated;
grant execute on function public.create_stock_transaction(bigint,text,numeric,text,text) to authenticated;

drop policy if exists "Allow authenticated product image uploads" on storage.objects;
create policy "Admins upload product images" on storage.objects for insert to authenticated
with check(bucket_id='product-images' and public.has_app_role(array['SUPER_ADMIN','ADMIN']));

comment on function public.has_app_role(text[]) is 'RLS-safe active-role check. Caller identity is derived only from auth.uid().';
comment on function public.create_stock_transaction(bigint,text,numeric,text,text) is
'Atomic role-authorized RECEIVE/ISSUE with Product row locking and a server-derived immutable actor snapshot.';
commit;
