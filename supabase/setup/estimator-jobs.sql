-- Run manually AFTER migration 059 and deployment of the estimator workers.
-- This project does not auto-apply SQL. No jobs are activated by the code change.
-- Enable pg_cron and pg_net. Reuse/create these Vault secrets:
-- gopair_payment_app_url = canonical https://gopairph.com (no trailing slash)
-- gopair_payment_cron_secret = same random >=32-character value as CRON_SECRET
DO $$
BEGIN
 IF to_regclass('public.estimator_sources') IS NULL THEN RAISE EXCEPTION 'Apply migration 059 first'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') OR NOT EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_net') THEN RAISE EXCEPTION 'Enable pg_cron and pg_net first'; END IF;
 IF to_regclass('vault.decrypted_secrets') IS NULL THEN RAISE EXCEPTION 'Configure Supabase Vault first'; END IF;
 IF NOT EXISTS(SELECT 1 FROM vault.decrypted_secrets WHERE name='gopair_payment_app_url' AND decrypted_secret IN('https://gopairph.com','https://www.gopairph.com')) THEN RAISE EXCEPTION 'Configure the canonical Vault app URL'; END IF;
 IF NOT EXISTS(SELECT 1 FROM vault.decrypted_secrets WHERE name='gopair_payment_cron_secret' AND length(decrypted_secret)>=32) THEN RAISE EXCEPTION 'Configure the Vault CRON_SECRET'; END IF;
END $$;
-- Daily at 09:00 Manila (01:00 UTC). Successful sources are due next calendar month;
-- failures retry the next day. Only permission-confirmed enabled sources are claimed.
SELECT cron.schedule('gopair-estimator-retail','0 1 * * *',$job$
 SELECT net.http_get(
  url:=(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='gopair_payment_app_url')||'/api/admin/price-estimator/refresh',
  headers:=jsonb_build_object('Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='gopair_payment_cron_secret')),
  timeout_milliseconds:=60000);
$job$);
SELECT cron.schedule('gopair-estimator-payments','*/5 * * * *',$job$
 SELECT net.http_get(
  url:=(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='gopair_payment_app_url')||'/api/admin/price-estimator/payments/reconcile',
  headers:=jsonb_build_object('Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='gopair_payment_cron_secret')),
  timeout_milliseconds:=60000);
$job$);
SELECT jobname,schedule,active FROM cron.job WHERE jobname IN('gopair-estimator-retail','gopair-estimator-payments');
-- Inspect actual HTTP responses, not only Cron's queued/succeeded state:
-- SELECT status_code,timed_out,error_msg,created FROM net._http_response ORDER BY created DESC LIMIT 10;
-- Disable without deleting data: SELECT cron.unschedule('gopair-estimator-retail');
-- Keep payment reconciliation running when pausing new purchases.
