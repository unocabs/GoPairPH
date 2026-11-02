-- Disposable local PostgreSQL only. Match the production profile read/update rules.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', TRUE), '')::UUID
$$;
GRANT USAGE ON SCHEMA auth, public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
CREATE TABLE public.profiles (id UUID PRIMARY KEY, user_id UUID UNIQUE, display_name TEXT);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY owner_update ON public.profiles FOR UPDATE USING (user_id = auth.uid());
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
INSERT INTO public.profiles VALUES
  ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Seller'),
  ('00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Other seller');
