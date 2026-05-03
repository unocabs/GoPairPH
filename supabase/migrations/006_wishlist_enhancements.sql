-- Expand wishlist_items
alter table wishlist_items add column if not exists color text;
alter table wishlist_items add column if not exists size_eu numeric;
alter table wishlist_items add column if not exists size_us numeric;
alter table wishlist_items add column if not exists size_cm numeric;
alter table wishlist_items add column if not exists price_min_php numeric;
alter table wishlist_items add column if not exists price_max_php numeric;
alter table wishlist_items drop column if exists size;

-- Reference photos for wishlist items (optional)
create table if not exists wishlist_images (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid references wishlist_items(id) on delete cascade not null,
  storage_path text not null,
  "order" int not null default 0,
  created_at timestamptz default now()
);

alter table wishlist_images enable row level security;

drop policy if exists "anyone_view_wishlist_images" on wishlist_images;
create policy "anyone_view_wishlist_images" on wishlist_images
  for select using (true);

drop policy if exists "owner_insert_wishlist_images" on wishlist_images;
create policy "owner_insert_wishlist_images" on wishlist_images
  for insert with check (
    wishlist_id in (
      select id from wishlist_items
      where user_id = (select id from profiles where user_id = auth.uid())
    )
  );

drop policy if exists "owner_delete_wishlist_images" on wishlist_images;
create policy "owner_delete_wishlist_images" on wishlist_images
  for delete using (
    wishlist_id in (
      select id from wishlist_items
      where user_id = (select id from profiles where user_id = auth.uid())
    )
  );

-- Suggestions: a non-owner picks one of their listings to suggest as a match
create table if not exists wishlist_suggestions (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid references wishlist_items(id) on delete cascade not null,
  shoe_id uuid references shoes(id) on delete cascade not null,
  suggester_id uuid references profiles(id) on delete cascade not null,
  message text,
  created_at timestamptz default now(),
  unique (wishlist_id, shoe_id)
);

alter table wishlist_suggestions enable row level security;

drop policy if exists "suggester_insert" on wishlist_suggestions;
create policy "suggester_insert" on wishlist_suggestions
  for insert with check (
    suggester_id = (select id from profiles where user_id = auth.uid())
  );

drop policy if exists "wishlist_owner_view_suggestions" on wishlist_suggestions;
create policy "wishlist_owner_view_suggestions" on wishlist_suggestions
  for select using (
    wishlist_id in (
      select id from wishlist_items
      where user_id = (select id from profiles where user_id = auth.uid())
    )
  );

drop policy if exists "suggester_view_own" on wishlist_suggestions;
create policy "suggester_view_own" on wishlist_suggestions
  for select using (
    suggester_id = (select id from profiles where user_id = auth.uid())
  );

drop policy if exists "suggester_delete_own" on wishlist_suggestions;
create policy "suggester_delete_own" on wishlist_suggestions
  for delete using (
    suggester_id = (select id from profiles where user_id = auth.uid())
  );
