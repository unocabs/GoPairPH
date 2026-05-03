-- Trade offers table
create table trade_offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references shoes(id) on delete cascade not null,
  offered_shoe_id uuid references shoes(id) on delete cascade not null,
  offerer_id uuid references profiles(id) on delete cascade not null,
  price_difference_php numeric,
  message text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now()
);

alter table trade_offers enable row level security;

-- Authenticated user can create an offer for their own profile
create policy "offerer_insert" on trade_offers
  for insert with check (
    offerer_id = (select id from profiles where user_id = auth.uid())
  );

-- Offerer can view their own sent offers
create policy "offerer_select" on trade_offers
  for select using (
    offerer_id = (select id from profiles where user_id = auth.uid())
  );

-- Listing owner can view offers on their shoes
create policy "listing_owner_select" on trade_offers
  for select using (
    exists (
      select 1 from shoes s
      join profiles p on p.id = s.seller_id
      where s.id = trade_offers.listing_id
      and p.user_id = auth.uid()
    )
  );

-- Listing owner can update offer status (accept / decline)
create policy "listing_owner_update" on trade_offers
  for update using (
    exists (
      select 1 from shoes s
      join profiles p on p.id = s.seller_id
      where s.id = trade_offers.listing_id
      and p.user_id = auth.uid()
    )
  );

-- RPC: accept a trade offer atomically (marks both shoes as traded, declines other pending offers)
create or replace function accept_trade_offer(p_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_id uuid;
  v_offered_shoe_id uuid;
  v_caller_profile_id uuid;
  v_listing_seller_id uuid;
begin
  select id into v_caller_profile_id from profiles where user_id = auth.uid();
  if v_caller_profile_id is null then
    raise exception 'Unauthorized';
  end if;

  select listing_id, offered_shoe_id
  into v_listing_id, v_offered_shoe_id
  from trade_offers where id = p_offer_id and status = 'pending';

  if not found then
    raise exception 'Offer not found or already processed';
  end if;

  select seller_id into v_listing_seller_id from shoes where id = v_listing_id;
  if v_listing_seller_id != v_caller_profile_id then
    raise exception 'Unauthorized: you do not own this listing';
  end if;

  update shoes set status = 'traded' where id = v_listing_id;
  update shoes set status = 'traded' where id = v_offered_shoe_id;
  update trade_offers set status = 'accepted' where id = p_offer_id;
  update trade_offers set status = 'declined'
    where listing_id = v_listing_id and id != p_offer_id and status = 'pending';
end;
$$;
