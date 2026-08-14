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
