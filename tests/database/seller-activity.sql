SET ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM public.record_profile_activity();
    RAISE EXCEPTION 'Anonymous heartbeat unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE last_active_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Existing profiles should have unknown activity';
  END IF;
END $$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
SELECT public.record_profile_activity();
DO $$ DECLARE first_seen TIMESTAMPTZ; BEGIN
  SELECT last_active_at INTO first_seen FROM public.profiles WHERE display_name = 'Seller';
  IF first_seen IS NULL OR abs(extract(epoch FROM (statement_timestamp() - first_seen))) > 5 THEN
    RAISE EXCEPTION 'Heartbeat did not use server time';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE display_name = 'Other seller' AND last_active_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Heartbeat changed another profile';
  END IF;
  PERFORM public.record_profile_activity();
  IF first_seen IS DISTINCT FROM (SELECT last_active_at FROM public.profiles WHERE display_name = 'Seller') THEN
    RAISE EXCEPTION 'Repeated heartbeat bypassed throttle';
  END IF;
  UPDATE public.profiles SET last_active_at = statement_timestamp() + INTERVAL '1 year', display_name = 'Updated seller'
    WHERE display_name = 'Seller';
  IF first_seen IS DISTINCT FROM (SELECT last_active_at FROM public.profiles WHERE display_name = 'Updated seller') THEN
    RAISE EXCEPTION 'Owner forged activity';
  END IF;
END $$;
RESET ROLE;

-- A new heartbeat refreshes an old timestamp, but does not fabricate history.
UPDATE public.profiles SET last_active_at = statement_timestamp() - INTERVAL '10 minutes'
WHERE display_name = 'Updated seller';
SET ROLE authenticated;
SELECT public.record_profile_activity();
DO $$ BEGIN
  IF (SELECT last_active_at < statement_timestamp() - INTERVAL '5 seconds' FROM public.profiles WHERE display_name = 'Updated seller') THEN
    RAISE EXCEPTION 'Old activity was not refreshed';
  END IF;
END $$;
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT public.record_profile_activity();
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE display_name = 'Other seller' AND last_active_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Missing identity updated activity';
  END IF;
END $$;
RESET ROLE;
