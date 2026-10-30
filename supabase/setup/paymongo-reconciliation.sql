-- Run manually in the Go Pair PH Supabase SQL Editor after migration 053 and
-- deployment of /api/admin/promotions/payments/reconcile. This is not auto-run.
-- First enable Cron (pg_cron) and pg_net in Supabase Integrations/Extensions.
-- Create these two secrets in Supabase Vault:
--   gopair_payment_app_url     = https://gopairph.com (canonical URL, no trailing /)
--   gopair_payment_cron_secret = the SAME value as Vercel's CRON_SECRET
-- This file deliberately contains no credentials and does not rotate secrets.

DO $preflight$
DECLARE
  app_url TEXT;
  cron_secret TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE EXCEPTION 'Enable Supabase Cron (pg_cron) under Integrations first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE EXCEPTION 'Enable the pg_net extension first';
  END IF;
  IF to_regclass('public.promotion_payments') IS NULL THEN
    RAISE EXCEPTION 'Apply migration 053_paymongo_promotion_payments.sql first';
  END IF;
  IF to_regclass('vault.decrypted_secrets') IS NULL THEN
    RAISE EXCEPTION 'Enable Supabase Vault and add the two payment cron secrets first';
  END IF;
  SELECT decrypted_secret INTO app_url FROM vault.decrypted_secrets WHERE name = 'gopair_payment_app_url';
  SELECT decrypted_secret INTO cron_secret FROM vault.decrypted_secrets WHERE name = 'gopair_payment_cron_secret';
  IF app_url IS NULL OR app_url NOT IN ('https://gopairph.com', 'https://www.gopairph.com') THEN
    RAISE EXCEPTION 'Set gopair_payment_app_url to the canonical Go Pair PH HTTPS URL without a trailing slash';
  END IF;
  IF cron_secret IS NULL OR length(cron_secret) < 32 THEN
    RAISE EXCEPTION 'Set gopair_payment_cron_secret to the same random secret as Vercel CRON_SECRET (at least 32 characters)';
  END IF;
END
$preflight$;

-- Re-running this named schedule updates it instead of adding another job.
SELECT cron.schedule(
  'gopair-payment-reconciliation',
  '*/5 * * * *',
  $job$
    SELECT net.http_get(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets
              WHERE name = 'gopair_payment_app_url')
              || '/api/admin/promotions/payments/reconcile',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' ||
          (SELECT decrypted_secret FROM vault.decrypted_secrets
           WHERE name = 'gopair_payment_cron_secret')
      ),
      timeout_milliseconds := 60000
    );
  $job$
);

SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'gopair-payment-reconciliation';

-- After five minutes, check Supabase Cron > History, then HTTP results with:
-- SELECT id, status_code, timed_out, error_msg, created
-- FROM net._http_response ORDER BY created DESC LIMIT 10;
-- HTTP 200 with a JSON "checked" count confirms the worker ran. A count of 0
-- is normal when no pending payment was checked. Cron "succeeded" alone only
-- means the outbound HTTP request was queued.
-- 401: CRON_SECRET differs between Vault and the deployed Vercel environment.
-- 404: worker code is not deployed, or the Vault URL points to the wrong site.
-- 500: inspect Vercel logs and confirm migration 053 was applied.
