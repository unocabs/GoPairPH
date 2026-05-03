-- Add Facebook Messenger username to profiles
alter table profiles add column if not exists fb_username text;

-- Add negotiable flag to shoes
alter table shoes add column if not exists is_negotiable boolean not null default false;

-- Add buyer's offered price to purchase_requests (for negotiable listings)
alter table purchase_requests add column if not exists offer_price_php numeric;
