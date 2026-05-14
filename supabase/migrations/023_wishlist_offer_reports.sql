-- Find My Pair lead reports.
-- Reports are created through the server route after Turnstile verification.
-- Public users do not read reports; admins can review them in the dashboard.

create table if not exists wishlist_offer_reports (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references wishlist_offers(id) on delete cascade,
  wishlist_id uuid not null references wishlist_items(id) on delete cascade,
  reason text not null check (
    reason in (
      'unavailable_or_sold',
      'price_changed',
      'wrong_item',
      'broken_link',
      'spam_or_duplicate',
      'other'
    )
  ),
  note text,
  reporter_id uuid references profiles(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'dismissed')),
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists wishlist_offer_reports_status_created_idx
  on wishlist_offer_reports(status, created_at desc);

create index if not exists wishlist_offer_reports_offer_idx
  on wishlist_offer_reports(offer_id, created_at desc);

create index if not exists wishlist_offer_reports_wishlist_idx
  on wishlist_offer_reports(wishlist_id, created_at desc);

alter table wishlist_offer_reports enable row level security;

drop policy if exists "admins_view_wishlist_offer_reports" on wishlist_offer_reports;
create policy "admins_view_wishlist_offer_reports"
  on wishlist_offer_reports for select
  using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
        and profiles.is_admin = true
    )
  );

drop policy if exists "admins_update_wishlist_offer_reports" on wishlist_offer_reports;
create policy "admins_update_wishlist_offer_reports"
  on wishlist_offer_reports for update
  using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
        and profiles.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
        and profiles.is_admin = true
    )
  );
