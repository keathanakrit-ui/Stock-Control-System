begin;

-- =============================================================================
-- Product image Storage bucket
-- =============================================================================
--
-- Product images are public application assets. The bucket-level MIME and size
-- limits mirror the frontend checks and remain authoritative for direct clients.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
);

-- =============================================================================
-- TEMPORARY anonymous development upload policy
-- =============================================================================
--
-- TEMPORARY: remove this policy and replace it with authenticated, role-based
-- access when Supabase Auth is implemented.
--
-- Public downloads are provided by the public bucket. Anonymous clients receive
-- INSERT access only. UPDATE and DELETE policies are intentionally absent because
-- uploads use unique object names and this first version does not remove images.

create policy "TEMPORARY allow anon product image uploads"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'product-images');

comment on policy "TEMPORARY allow anon product image uploads"
  on storage.objects is
  'TEMPORARY development policy. Remove and replace with authenticated, role-based access when Supabase Auth is implemented.';

commit;
