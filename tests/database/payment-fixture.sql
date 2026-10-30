-- Minimal local Supabase stand-in. Never run this fixture on a hosted project.
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
CREATE EXTENSION "uuid-ossp";
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', TRUE),'')::UUID $$;
CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE SQL STABLE AS $$ SELECT current_user::TEXT $$;
CREATE SCHEMA storage;
CREATE TABLE storage.buckets(id TEXT PRIMARY KEY,name TEXT,public BOOLEAN);
CREATE TABLE storage.objects(id UUID DEFAULT uuid_generate_v4(),bucket_id TEXT,name TEXT);
CREATE FUNCTION storage.foldername(TEXT) RETURNS TEXT[] LANGUAGE SQL AS $$ SELECT string_to_array($1,'/') $$;
CREATE TABLE profiles(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),user_id UUID NOT NULL UNIQUE,is_admin BOOLEAN DEFAULT FALSE,is_verified BOOLEAN DEFAULT FALSE);
CREATE TABLE shoes(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),seller_id UUID REFERENCES profiles(id),status TEXT DEFAULT 'active',featured_until TIMESTAMPTZ,sponsored_until TIMESTAMPTZ,sponsored_started_at TIMESTAMPTZ,created_at TIMESTAMPTZ DEFAULT NOW(),quality_flagged_at TIMESTAMPTZ,quality_flag_reason TEXT,quality_flag_note TEXT,quality_flagged_by UUID);
CREATE FUNCTION set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=NOW(); RETURN NEW; END $$;
