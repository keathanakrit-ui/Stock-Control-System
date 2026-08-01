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
