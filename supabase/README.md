# Supabase migrations

All migrations in this folder must be reviewed before they are executed.

For now, apply a migration manually:

1. Open the Supabase Dashboard and select the project.
2. Open **SQL Editor** and create a new query.
3. Copy the complete migration SQL into the editor.
4. Review the target project and SQL again before selecting **Run**.
5. Verify the resulting tables, policies, view, function, and grants.

Never place a `service_role` key, database password, API secret, or other
credential in this folder.

`stock_transactions` is an append-only stock movement ledger. Application
clients must create movements through the approved database function and must
not update or delete ledger entries.

Current stock is derived from stock transactions. It is not stored in the
`products` table.

## STEP 31 LINE notification engine (local only)

The `stock-notifications` Edge Function is a server-to-server endpoint. It must
not be called from the frontend. Configure these Supabase server-side secrets:

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_NOTIFICATION_TARGET_ID`
- `NOTIFICATION_ENGINE_SECRET` (a separate high-entropy random value)

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to deployed Edge
Functions by Supabase. Never put any of these values in a frontend environment
file or commit them to this repository.

After migration review and deployment approval, invoke the function with a
scheduled server-side POST whose `Authorization` header is
`Bearer <NOTIFICATION_ENGINE_SECRET>`. The migration stores no LINE secrets.
It only stores delivery state used for event deduplication, a 24-hour reminder
cooldown, a 15-minute failure retry interval, and a five-minute concurrency
lease.

The production Cron job is named
`stock-notifications-daily-0800-bangkok`. It runs at `0 1 * * *` (01:00 UTC,
08:00 Asia/Bangkok) and reads `stock_notification_engine_secret` from Supabase
Vault. The Vault value must match the Edge Function
`NOTIFICATION_ENGINE_SECRET`; neither value belongs in migration SQL or source
control.

## STEP 33 Notification monitoring and audit

Each authorized engine invocation creates a row in `stock_notification_runs`
and returns its `runId`. The run records start/completion times, terminal status,
product and delivery counts, and a bounded failure summary. Every claimed item
that reaches LINE delivery also creates an append-only row in
`stock_notification_delivery_attempts`.

Only the Edge Function service role can write monitoring data. Active
`SUPER_ADMIN` and `ADMIN` users may read both audit tables through RLS; other
authenticated roles and anonymous users cannot. Audit rows are intentionally
not cascaded when a Product is deleted: each attempt retains immutable Product
ID, code, and name snapshots so operational history remains understandable.

## STEP 34 Notification monitoring dashboard (local only)

The frontend notification monitoring page is available only to active
`SUPER_ADMIN` and `ADMIN` users. It shows recent engine runs, delivery attempts,
summary counts, and filters for date, run status, and stock condition. Database
RLS remains the authoritative access control; the route and sidebar visibility
provide an additional user-interface guard.

## STEP 35 Employee account administration (local only)

The `admin-users` Edge Function creates employee accounts from an Employee ID,
initial password, full name, role, and active status. It validates the caller's
Supabase access token and requires an active `SUPER_ADMIN` profile before using
the server-only service role to create the Auth user. The frontend never
receives the service-role key or the generated internal Auth email address.

Managed roles are limited to `ADMIN`, `STORE`, and `USER`; creating another
`SUPER_ADMIN` remains an explicit dashboard/database administration action.

Accounts with a real email address may use the frontend password-recovery flow.
Supabase Auth must allow both the production and local `/reset-password` URLs.
Employee-only accounts backed by the internal email domain require a
`SUPER_ADMIN`-initiated password reset because that address cannot receive mail.
