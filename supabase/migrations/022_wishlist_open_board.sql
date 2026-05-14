-- Wishlist → Open Offer Board
-- 1. Allow anonymous wishlist posts.
-- 2. Add a buyer-side "location" field on wishlist items.
-- 3. Add wishlist_offers (URL-based offers that anyone can leave).
--
-- Writes for anonymous posts/offers flow through server route handlers using
-- the service-role client (Turnstile-validated). RLS therefore stays restrictive
-- for direct anon-key inserts.

alter table wishlist_items alter column user_id drop not null;

alter table wishlist_items add column if not exists location text;

create table if not exists wishlist_offers (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references wishlist_items(id) on delete cascade,
  url text not null,
  price_php numeric,
  note text,
  offerer_id uuid references profiles(id) on delete set null,
  shoe_id uuid references shoes(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists wishlist_offers_wishlist_idx
  on wishlist_offers(wishlist_id, created_at desc);

alter table wishlist_offers enable row level security;

create policy "anyone_view_wishlist_offers" on wishlist_offers
  for select using (true);
