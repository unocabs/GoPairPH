-- Apply manually in the Supabase SQL Editor. Activity starts at rollout; do not
-- infer it from listing edits, profile updated_at, or historical sign-ins.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Owners can edit their profile, but cannot invent an activity timestamp.
CREATE OR REPLACE FUNCTION public.guard_profile_activity()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.last_active_at := NULL;
    ELSE
      NEW.last_active_at := OLD.last_active_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_activity ON public.profiles;
CREATE TRIGGER guard_profile_activity BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_activity();

CREATE OR REPLACE FUNCTION public.record_profile_activity()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- Identity and time come from the server, never from client parameters.
  UPDATE public.profiles SET last_active_at = statement_timestamp()
  WHERE user_id = (SELECT auth.uid())
    AND (last_active_at IS NULL OR last_active_at <= statement_timestamp() - INTERVAL '2 minutes');
END;
$$;

REVOKE ALL ON FUNCTION public.guard_profile_activity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_profile_activity() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_profile_activity() TO authenticated;

COMMENT ON COLUMN public.profiles.last_active_at IS
  'Approximate last visible signed-in site session; updated by record_profile_activity, not a guarantee of availability.';
