-- Add 'reserved' to allowed shoe statuses
alter table shoes drop constraint if exists shoes_status_check;
alter table shoes add constraint shoes_status_check
  check (status in ('active', 'reserved', 'sold', 'traded', 'donated', 'archived'));

-- Purchase requests table
create table purchase_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references shoes(id) on delete cascade not null,
  buyer_id uuid references profiles(id) on delete cascade not null,
  message text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'completed')),
  created_at timestamptz default now()
);

alter table purchase_requests enable row level security;

create policy "buyer_insert" on purchase_requests
  for insert with check (
    buyer_id = (select id from profiles where user_id = auth.uid())
  );

create policy "buyer_select" on purchase_requests
  for select using (
    buyer_id = (select id from profiles where user_id = auth.uid())
  );

create policy "listing_owner_select_purchases" on purchase_requests
  for select using (
    exists (
      select 1 from shoes s
      join profiles p on p.id = s.seller_id
      where s.id = purchase_requests.listing_id
      and p.user_id = auth.uid()
    )
  );

create policy "listing_owner_update_purchases" on purchase_requests
  for update using (
    exists (
      select 1 from shoes s
      join profiles p on p.id = s.seller_id
      where s.id = purchase_requests.listing_id
      and p.user_id = auth.uid()
    )
  );

-- Accept a purchase request: listing -> reserved, request -> accepted, others declined
create or replace function accept_purchase_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_id uuid;
  v_caller_profile_id uuid;
  v_listing_seller_id uuid;
begin
  select id into v_caller_profile_id from profiles where user_id = auth.uid();
  if v_caller_profile_id is null then raise exception 'Unauthorized'; end if;

  select listing_id into v_listing_id
  from purchase_requests where id = p_request_id and status = 'pending';
  if not found then raise exception 'Request not found or already processed'; end if;

  select seller_id into v_listing_seller_id from shoes where id = v_listing_id;
  if v_listing_seller_id != v_caller_profile_id then
    raise exception 'Unauthorized: you do not own this listing';
  end if;

  update shoes set status = 'reserved' where id = v_listing_id;
  update purchase_requests set status = 'accepted' where id = p_request_id;
  update purchase_requests set status = 'declined'
    where listing_id = v_listing_id and id != p_request_id and status = 'pending';
end;
$$;

-- Complete a sale: listing -> sold, request -> completed (FINAL, no relist)
create or replace function complete_purchase(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_id uuid;
  v_caller_profile_id uuid;
  v_listing_seller_id uuid;
begin
  select id into v_caller_profile_id from profiles where user_id = auth.uid();
  if v_caller_profile_id is null then raise exception 'Unauthorized'; end if;

  select listing_id into v_listing_id
  from purchase_requests where id = p_request_id and status = 'accepted';
  if not found then raise exception 'Request not found or not in accepted state'; end if;

  select seller_id into v_listing_seller_id from shoes where id = v_listing_id;
  if v_listing_seller_id != v_caller_profile_id then
    raise exception 'Unauthorized: you do not own this listing';
  end if;

  update shoes set status = 'sold' where id = v_listing_id;
  update purchase_requests set status = 'completed' where id = p_request_id;
  update purchase_requests set status = 'declined'
    where listing_id = v_listing_id and id != p_request_id and status in ('pending', 'accepted');
end;
$$;

-- Cancel an accepted request: listing -> active, request -> declined
create or replace function cancel_purchase_acceptance(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_id uuid;
  v_caller_profile_id uuid;
  v_listing_seller_id uuid;
begin
  select id into v_caller_profile_id from profiles where user_id = auth.uid();
  if v_caller_profile_id is null then raise exception 'Unauthorized'; end if;

  select listing_id into v_listing_id
  from purchase_requests where id = p_request_id and status = 'accepted';
  if not found then raise exception 'Request not found or not in accepted state'; end if;

  select seller_id into v_listing_seller_id from shoes where id = v_listing_id;
  if v_listing_seller_id != v_caller_profile_id then
    raise exception 'Unauthorized';
  end if;

  update shoes set status = 'active' where id = v_listing_id;
  update purchase_requests set status = 'declined' where id = p_request_id;
end;
$$;
