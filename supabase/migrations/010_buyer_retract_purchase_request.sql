-- Buyer-side retract: works for both pending and accepted requests.
-- If the request is accepted, also reverts the listing back to 'active'
-- (it was 'reserved' for this buyer).
create or replace function retract_purchase_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_profile_id uuid;
  v_buyer_id uuid;
  v_listing_id uuid;
  v_status text;
begin
  select id into v_caller_profile_id from profiles where user_id = auth.uid();
  if v_caller_profile_id is null then raise exception 'Unauthorized'; end if;

  select buyer_id, listing_id, status
    into v_buyer_id, v_listing_id, v_status
    from purchase_requests where id = p_request_id;
  if not found then raise exception 'Request not found'; end if;

  if v_buyer_id != v_caller_profile_id then
    raise exception 'Unauthorized: you are not the buyer';
  end if;

  if v_status not in ('pending', 'accepted') then
    raise exception 'Request cannot be retracted in its current state';
  end if;

  -- If we were holding the listing reserved, release it
  if v_status = 'accepted' then
    update shoes set status = 'active' where id = v_listing_id and status = 'reserved';
  end if;

  update purchase_requests set status = 'declined' where id = p_request_id;
end;
$$;
