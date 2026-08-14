begin;

create table public.stock_notification_runs (
  id uuid primary key,
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  status text not null default 'RUNNING'
    check (status in ('RUNNING', 'SUCCEEDED', 'PARTIAL_FAILED', 'FAILED')),
  products_scanned integer not null default 0 check (products_scanned >= 0),
  notifications_claimed integer not null default 0 check (notifications_claimed >= 0),
  notifications_sent integer not null default 0 check (notifications_sent >= 0),
  notifications_failed integer not null default 0 check (notifications_failed >= 0),
  error text null,
  check (
    (status = 'RUNNING' and completed_at is null)
    or (status <> 'RUNNING' and completed_at is not null)
  )
);

create table public.stock_notification_delivery_attempts (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.stock_notification_runs(id) on delete restrict,
  product_id bigint not null,
  product_code text not null,
  product_name text not null,
  condition text not null
    check (condition in ('LOW_STOCK', 'OVER_STOCK', 'NON_MOVEMENT')),
  attempted_at timestamptz not null default now(),
  success boolean not null,
  error text null,
  check ((success and error is null) or (not success and error is not null))
);

create index stock_notification_runs_started_at_idx
  on public.stock_notification_runs (started_at desc);
create index stock_notification_delivery_attempts_run_id_idx
  on public.stock_notification_delivery_attempts (run_id, attempted_at);
create index stock_notification_delivery_attempts_product_id_idx
  on public.stock_notification_delivery_attempts (product_id, attempted_at desc);

comment on table public.stock_notification_runs is
  'Append-only operational audit summary for each authorized stock notification engine invocation.';
comment on table public.stock_notification_delivery_attempts is
  'Append-only per-product delivery outcome audit with immutable Product identity snapshots.';

alter table public.stock_notification_runs enable row level security;
alter table public.stock_notification_delivery_attempts enable row level security;

revoke all on table public.stock_notification_runs from public, anon, authenticated;
revoke all on table public.stock_notification_delivery_attempts from public, anon, authenticated;
revoke all on sequence public.stock_notification_delivery_attempts_id_seq
  from public, anon, authenticated;

grant select, insert, update on table public.stock_notification_runs to service_role;
grant select, insert on table public.stock_notification_delivery_attempts to service_role;
grant usage, select on sequence public.stock_notification_delivery_attempts_id_seq
  to service_role;

grant select on table public.stock_notification_runs to authenticated;
grant select on table public.stock_notification_delivery_attempts to authenticated;

create policy "Admins read notification runs"
  on public.stock_notification_runs for select to authenticated
  using (public.has_app_role(array['SUPER_ADMIN', 'ADMIN']));

create policy "Admins read notification delivery attempts"
  on public.stock_notification_delivery_attempts for select to authenticated
  using (public.has_app_role(array['SUPER_ADMIN', 'ADMIN']));

commit;
