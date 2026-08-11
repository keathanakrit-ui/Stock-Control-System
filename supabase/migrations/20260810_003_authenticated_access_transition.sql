begin;

-- =============================================================================
-- STEP 28 authenticated access transition
-- =============================================================================
--
-- Review and apply manually only after the authentication flow is working.
-- Every signed-in user temporarily receives the same application permissions.
-- Role-specific authorization belongs in STEP 29.


-- =============================================================================
-- 1. Product Master
-- =============================================================================
--
-- The current Product UI reads, creates, edits, and deletes Products. INSERT and
-- UPDATE also chain SELECT so the saved row can be returned to the frontend.
-- Anonymous Product access is no longer required because every application route
-- is protected. Existing anon Product RLS policies may remain in the database,
-- but the privilege revokes below make them ineffective.

alter table public.products enable row level security;

revoke all on table public.products from public;
revoke all on table public.products from anon;

grant select, insert, update, delete
  on table public.products
  to authenticated;

create policy "Allow authenticated read products"
  on public.products
  for select
  to authenticated
  using (true);

create policy "Allow authenticated create products"
  on public.products
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated update products"
  on public.products
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated delete products"
  on public.products
  for delete
  to authenticated
  using (true);

-- Grant access to the Product identity/serial sequence when one exists. The
-- dynamic lookup avoids assuming the sequence name or ID implementation.
do $$
declare
  v_products_id_sequence text;
begin
  v_products_id_sequence :=
    pg_catalog.pg_get_serial_sequence('public.products', 'id');

  if v_products_id_sequence is not null then
    execute pg_catalog.format(
      'revoke all on sequence %s from public',
      v_products_id_sequence
    );
    execute pg_catalog.format(
      'revoke all on sequence %s from anon',
      v_products_id_sequence
    );
    execute pg_catalog.format(
      'grant usage, select on sequence %s to authenticated',
      v_products_id_sequence
    );
  end if;
end;
$$;


-- =============================================================================
-- 2. Append-only stock transaction history
-- =============================================================================
--
-- Signed-in users may read the ledger. No direct INSERT, UPDATE, DELETE, or
-- sequence privileges are granted. Stock mutations remain RPC-only.

revoke select on table public.stock_transactions from anon;

drop policy if exists "Allow anon read stock transactions"
  on public.stock_transactions;

grant select on table public.stock_transactions to authenticated;

create policy "Allow authenticated read stock transactions"
  on public.stock_transactions
  for select
  to authenticated
  using (true);


-- =============================================================================
-- 3. Derived Product stock summary
-- =============================================================================
--
-- product_stock_summary is security_invoker. The authenticated caller therefore
-- also needs SELECT access and RLS visibility on products and stock_transactions,
-- provided above.

revoke select on table public.product_stock_summary from anon;
grant select on table public.product_stock_summary to authenticated;


-- =============================================================================
-- 4. Stock mutation RPC
-- =============================================================================

revoke execute on function public.create_stock_transaction(
  bigint,
  text,
  numeric,
  text,
  text
) from anon;

grant execute on function public.create_stock_transaction(
  bigint,
  text,
  numeric,
  text,
  text
) to authenticated;


-- =============================================================================
-- 5. Product image Storage
-- =============================================================================
--
-- The product-images bucket remains public, so direct public object URLs do not
-- require a storage.objects SELECT policy. The frontend uses unique names with
-- upsert disabled and does not delete objects, so UPDATE and DELETE are absent.

drop policy if exists "TEMPORARY public read product images"
  on storage.objects;

drop policy if exists "TEMPORARY allow anon product image uploads"
  on storage.objects;

drop policy if exists "TEMPORARY anon upload product images"
  on storage.objects;

create policy "Allow authenticated product image uploads"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'product-images');

comment on policy "Allow authenticated product image uploads"
  on storage.objects is
  'STEP 28 baseline. Replace with role-specific authorization in STEP 29.';

commit;
