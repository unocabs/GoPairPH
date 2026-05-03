-- Admin + verification flags on profiles
alter table profiles add column if not exists is_admin boolean not null default false;
alter table profiles add column if not exists is_verified boolean not null default false;

-- Verification requests
create table if not exists verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  proof text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- Only one pending request per user (history of approved/rejected is preserved)
create unique index if not exists verification_requests_pending_unique
  on verification_requests (user_id) where status = 'pending';

alter table verification_requests enable row level security;

drop policy if exists "user_insert_own_verification" on verification_requests;
create policy "user_insert_own_verification" on verification_requests
  for insert with check (user_id = (select id from profiles where user_id = auth.uid()));

drop policy if exists "user_view_own_verification" on verification_requests;
create policy "user_view_own_verification" on verification_requests
  for select using (user_id = (select id from profiles where user_id = auth.uid()));

drop policy if exists "admin_view_all_verifications" on verification_requests;
create policy "admin_view_all_verifications" on verification_requests
  for select using (
    exists (select 1 from profiles where user_id = auth.uid() and is_admin = true)
  );

-- Admin RPCs (security definer so they can update any profile)
create or replace function approve_verification(p_request_id uuid, p_notes text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_caller_admin boolean;
  v_caller_profile_id uuid;
begin
  select id, is_admin into v_caller_profile_id, v_caller_admin
  from profiles where user_id = auth.uid();
  if not coalesce(v_caller_admin, false) then raise exception 'Unauthorized: admin only'; end if;

  select user_id into v_user_id from verification_requests
  where id = p_request_id and status = 'pending';
  if not found then raise exception 'Request not found or already processed'; end if;

  update profiles set is_verified = true where id = v_user_id;
  update verification_requests set
    status = 'approved',
    admin_notes = p_notes,
    reviewed_by = v_caller_profile_id,
    reviewed_at = now()
  where id = p_request_id;
end;
$$;

create or replace function reject_verification(p_request_id uuid, p_notes text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_admin boolean;
  v_caller_profile_id uuid;
begin
  select id, is_admin into v_caller_profile_id, v_caller_admin
  from profiles where user_id = auth.uid();
  if not coalesce(v_caller_admin, false) then raise exception 'Unauthorized: admin only'; end if;

  update verification_requests set
    status = 'rejected',
    admin_notes = p_notes,
    reviewed_by = v_caller_profile_id,
    reviewed_at = now()
  where id = p_request_id and status = 'pending';
  if not found then raise exception 'Request not found or already processed'; end if;
end;
$$;

-- Revoke verification (in case verified user starts misbehaving)
create or replace function revoke_verification(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_caller_admin boolean;
begin
  select is_admin into v_caller_admin from profiles where user_id = auth.uid();
  if not coalesce(v_caller_admin, false) then raise exception 'Unauthorized: admin only'; end if;
  update profiles set is_verified = false where id = p_user_id;
end;
$$;

-- Toggle admin status (admin only). Bootstrap your first admin manually:
--   update profiles set is_admin = true where display_name = 'Your Name';
create or replace function set_admin(p_user_id uuid, p_is_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_caller_admin boolean;
begin
  select is_admin into v_caller_admin from profiles where user_id = auth.uid();
  if not coalesce(v_caller_admin, false) then raise exception 'Unauthorized: admin only'; end if;
  update profiles set is_admin = p_is_admin where id = p_user_id;
end;
$$;
