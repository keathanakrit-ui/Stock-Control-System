begin;

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Prerequisite: Vault must contain stock_notification_engine_secret, and its
-- decrypted value must match the Edge Function NOTIFICATION_ENGINE_SECRET.
-- 01:00 UTC is 08:00 in Asia/Bangkok (UTC+7, no daylight saving time).
select cron.schedule(
  'stock-notifications-daily-0800-bangkok',
  '0 1 * * *',
  $schedule$
    select net.http_post(
      url := 'https://vhwlazenmfjzjgjgmlnf.supabase.co/functions/v1/stock-notifications',
      headers := pg_catalog.jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'stock_notification_engine_secret'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    ) as request_id;
  $schedule$
);

commit;
