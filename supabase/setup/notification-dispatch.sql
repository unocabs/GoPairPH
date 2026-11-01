-- MANUAL SETUP: run after migrations 055–057 and deployment of the worker.
-- Keep the existing payment reconciliation job and CRON_SECRET unchanged.
-- Enable pg_cron, pg_net, and Vault. Reuse these existing Vault secret names:
-- gopair_payment_app_url = canonical https://gopairph.com (no trailing slash)
-- gopair_payment_cron_secret = the SAME existing Vercel Production CRON_SECRET.
-- These names are retained for compatibility; no payment settings are changed.
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') OR NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE EXCEPTION 'Enable pg_cron and pg_net first';
  END IF;
  IF to_regclass('public.notification_jobs') IS NULL THEN RAISE EXCEPTION 'Apply migrations 055–057 first'; END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'gopair_payment_app_url' AND decrypted_secret IN ('https://gopairph.com', 'https://www.gopairph.com')) THEN RAISE EXCEPTION 'Configure the canonical site URL in Vault'; END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'gopair_payment_cron_secret' AND length(decrypted_secret) >= 32) THEN
    RAISE EXCEPTION 'Configure the existing CRON_SECRET in Vault; do not rotate it';
  END IF;
END;
$$;
-- BEGIN MARKETPLACE LOCKDOWN
-- Apply only after the new RPC-backed offer/status endpoints are deployed.
REVOKE INSERT, UPDATE, DELETE ON public.purchase_requests FROM anon, authenticated;
GRANT SELECT ON public.purchase_requests TO authenticated;
-- END MARKETPLACE LOCKDOWN
SELECT cron.schedule('gopair-notification-dispatch', '* * * * *', $job$
  SELECT net.http_get(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'gopair_payment_app_url') || '/api/admin/notifications/process',
    headers := jsonb_build_object('Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'gopair_payment_cron_secret')),
    timeout_milliseconds := 60000
  );
$job$);
SELECT jobname, schedule, active FROM cron.job WHERE jobname IN ('gopair-notification-dispatch', 'gopair-payment-reconciliation');
COMMIT;
-- Read-only verification after a minute:
-- SELECT id,status_code,timed_out,error_msg,created FROM net._http_response ORDER BY created DESC LIMIT 10;
-- Cron "succeeded" only confirms queueing the HTTP call. Verify HTTP 200 as well.
-- 401: deployed and Vault secrets differ. 404: deploy the endpoint first.
-- 503: configure Resend. 500: inspect runtime logs/migration state.
-- Inspect dead jobs without exposing payloads:
-- SELECT id,kind,status,attempts,last_error FROM public.notification_jobs WHERE status='dead';
