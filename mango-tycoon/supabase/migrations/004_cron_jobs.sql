-- ============================================================
-- MANGO TYCOON — pg_cron scheduled jobs
-- Requires: enable pg_cron extension in Supabase dashboard
--   Dashboard → Database → Extensions → pg_cron
-- ============================================================

-- Run sync-market-data every 30 minutes
select cron.schedule(
  'sync-market-data',
  '*/30 * * * *',
  $$
  select
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/sync-market-data',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'x-scheduled',   'true',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Run sync-football once a day at 02:00 UTC (23:00 ARG)
select cron.schedule(
  'sync-football',
  '0 2 * * *',
  $$
  select
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/sync-football',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'x-scheduled',   'true',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- ────────────────────────────────────────────────────────────
-- MANUAL SETUP INSTRUCTIONS (run once in Supabase SQL editor)
-- ────────────────────────────────────────────────────────────
-- 1. Enable pg_cron:
--    Dashboard > Database > Extensions > search "pg_cron" > Enable
--
-- 2. Enable pg_net (HTTP from SQL):
--    Dashboard > Database > Extensions > search "pg_net" > Enable
--
-- 3. Set app settings (so the cron can find the URL):
--    ALTER DATABASE postgres SET app.supabase_url = 'https://YOUR_PROJECT.supabase.co';
--    ALTER DATABASE postgres SET app.supabase_service_role_key = 'YOUR_SERVICE_ROLE_KEY';
--
-- 4. Set Supabase secrets for Edge Functions:
--    supabase secrets set FOOTBALL_API_KEY=your_key_from_football-data.org
--
-- 5. Deploy Edge Functions:
--    supabase functions deploy sync-market-data
--    supabase functions deploy sync-football
--    supabase functions deploy buy-asset
--    supabase functions deploy collect-income
--    supabase functions deploy claim-objective
