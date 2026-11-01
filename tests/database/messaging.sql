\set ON_ERROR_STOP on
BEGIN;
INSERT INTO profiles (id,user_id) VALUES
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
 ('33333333-3333-4333-8333-333333333333','cccccccc-cccc-4ccc-8ccc-cccccccccccc');
INSERT INTO shoes (id,seller_id) VALUES ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
DO $$ DECLARE m chat_messages; again chat_messages; BEGIN
  m := chat_send('Can you ship?', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', NULL, '44444444-4444-4444-8444-444444444444');
  PERFORM set_config('test.conversation',m.conversation_id::TEXT,true);
  again := chat_send('Can you ship?', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', NULL, '44444444-4444-4444-8444-444444444444');
  ASSERT m.id = again.id, 'Retry must reuse original message';
  ASSERT (SELECT COUNT(*) FROM chat_messages) = 1, 'Retry must not duplicate';
  BEGIN INSERT INTO chat_messages (conversation_id,sequence,body) VALUES (m.conversation_id,99,'Spoof'); RAISE EXCEPTION 'Direct insert allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-cccccccccccc',true);
DO $$ BEGIN
  ASSERT (SELECT COUNT(*) FROM chat_messages) = 0, 'Outsider can read messages';
  ASSERT (SELECT COUNT(*) FROM chat_conversations) = 0, 'Outsider can read inbox';
  BEGIN PERFORM chat_send('Spoof','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',current_setting('test.conversation')::UUID); RAISE EXCEPTION 'Outsider send allowed';
  EXCEPTION WHEN raise_exception THEN ASSERT SQLERRM = 'Conversation unavailable'; END;
END $$;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
DO $$ BEGIN
  ASSERT chat_unread_count() = 1;
  PERFORM chat_mark_read(current_setting('test.conversation')::UUID,1);
  ASSERT chat_unread_count() = 0;
  PERFORM chat_mark_read(current_setting('test.conversation')::UUID,0);
  ASSERT (SELECT seller_read_sequence FROM chat_conversations LIMIT 1) = 1, 'Read cursor moved backwards';
  PERFORM chat_block(current_setting('test.conversation')::UUID,TRUE);
END $$;
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
DO $$ BEGIN
  BEGIN PERFORM chat_send('Blocked','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',current_setting('test.conversation')::UUID); RAISE EXCEPTION 'Blocked send allowed';
  EXCEPTION WHEN raise_exception THEN ASSERT SQLERRM LIKE 'Messaging is unavailable%'; END;
  BEGIN PERFORM marketplace_submit_offer('44444444-4444-4444-8444-444444444444','dddddddd-dddd-4ddd-8ddd-ddddddddddda',NULL,4500); RAISE EXCEPTION 'Blocked offer allowed';
  EXCEPTION WHEN raise_exception THEN ASSERT SQLERRM LIKE 'Requests are unavailable%'; END;
  PERFORM chat_report(current_setting('test.conversation')::UUID,'Please review this test conversation');
  BEGIN PERFORM admin_chat_report(gen_random_uuid()); RAISE EXCEPTION 'Non-admin report access allowed';
  EXCEPTION WHEN raise_exception THEN ASSERT SQLERRM='Admin only'; END;
END $$;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
SELECT chat_block(current_setting('test.conversation')::UUID,FALSE);
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
DO $$ DECLARE r purchase_requests; again purchase_requests; BEGIN
  r := marketplace_submit_offer('44444444-4444-4444-8444-444444444444','ffffffff-ffff-4fff-8fff-ffffffffffff',NULL,4500);
  PERFORM set_config('test.request',r.id::TEXT,true);
  again := marketplace_submit_offer('44444444-4444-4444-8444-444444444444','ffffffff-ffff-4fff-8fff-ffffffffffff',NULL,4500);
  ASSERT r.id = again.id;
  again := marketplace_submit_offer('44444444-4444-4444-8444-444444444444','dddddddd-dddd-4ddd-8ddd-ddddddddddd1',NULL,4300);
  ASSERT r.id = again.id, 'Different button created duplicate active offer';
  r := marketplace_submit_offer('44444444-4444-4444-8444-444444444444','dddddddd-dddd-4ddd-8ddd-ddddddddddd2',NULL,4400,NULL,r.id,1);
  ASSERT r.version = 2;
END $$;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
DO $$ DECLARE r purchase_requests; BEGIN
  BEGIN PERFORM marketplace_request_action(current_setting('test.request')::UUID,'accept',1); RAISE EXCEPTION 'Stale accept allowed';
  EXCEPTION WHEN raise_exception THEN ASSERT SQLERRM LIKE 'This request changed%'; END;
  r := marketplace_request_action(current_setting('test.request')::UUID,'accept',2);
  ASSERT r.status = 'accepted';
  PERFORM accept_purchase_request(r.id);
  ASSERT (SELECT status FROM shoes LIMIT 1) = 'reserved';
END $$;
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
SELECT retract_purchase_request(current_setting('test.request')::UUID);
DO $$ BEGIN
  ASSERT (SELECT status_reason FROM purchase_requests LIMIT 1) = 'buyer_withdrew';
  ASSERT (SELECT status FROM shoes LIMIT 1) = 'active';
END $$;
RESET ROLE;
DO $$ DECLARE r UUID; detail JSONB; BEGIN
  SELECT id INTO r FROM chat_reports LIMIT 1;
  UPDATE profiles SET is_admin=TRUE WHERE id='33333333-3333-4333-8333-333333333333';
  PERFORM set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-cccccccccccc',TRUE);
  detail:=admin_chat_report(r);
  ASSERT jsonb_array_length(detail->'messages')>0;
  ASSERT (SELECT COUNT(*) FROM chat_report_reviews)=1, 'Report access was not recorded';
  PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',TRUE);
END $$;
-- Notification delay, read-before-send suppression, lease recovery and cooldown.
DO $$ DECLARE j notification_jobs; batch JSONB; BEGIN
  ASSERT (SELECT COUNT(*) FROM notification_jobs WHERE kind='chat' AND status='pending') <= 2;
  UPDATE notification_jobs SET ready_at = NOW() - INTERVAL '1 second';
  UPDATE chat_conversations SET seller_first_unread_at = NOW() - INTERVAL '4 minutes', buyer_first_unread_at = NOW() - INTERVAL '4 minutes';
  FOR j IN SELECT * FROM claim_notification_jobs(5) LOOP
    batch := prepare_chat_notification(j.id,j.lease_token);
    PERFORM finish_notification_job(j.id,j.lease_token,CASE WHEN jsonb_array_length(batch)>0 THEN 'sent' ELSE 'skipped' END);
  END LOOP;
  ASSERT NOT EXISTS (SELECT 1 FROM notification_jobs WHERE status='processing');
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
SELECT chat_send('One more question','dddddddd-dddd-4ddd-8ddd-ddddddddddd3',current_setting('test.conversation')::UUID);
RESET ROLE;
DO $$ BEGIN
  ASSERT NOT EXISTS (SELECT 1 FROM notification_jobs WHERE kind='chat' AND recipient_id='11111111-1111-4111-8111-111111111111' AND status IN ('pending','processing')), 'Repeated unread episode sent another alert';
END $$;
-- Durable reminder enqueue + marker form a transaction; retries reuse the job.
DO $$ DECLARE ok BOOLEAN; BEGIN
  ok := queue_renewal_notification('44444444-4444-4444-8444-444444444444',NULL,'{"html":"test","subject":"test"}');
  ASSERT ok;
  ASSERT NOT queue_renewal_notification('44444444-4444-4444-8444-444444444444',NULL,'{}');
  ASSERT (SELECT COUNT(*) FROM notification_jobs WHERE kind='renewal')=1;
END $$;
-- Listing removal retains private correspondence and a minimal snapshot.
-- New unread episode is delayed by the recipient-wide email cooldown.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
SELECT chat_mark_read(current_setting('test.conversation')::UUID,9999);
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
SELECT chat_send('New unread episode','dddddddd-dddd-4ddd-8ddd-ddddddddddd4',current_setting('test.conversation')::UUID);
RESET ROLE;
DO $$ DECLARE j notification_jobs; BEGIN
  SELECT * INTO j FROM notification_jobs WHERE kind='chat' AND recipient_id='11111111-1111-4111-8111-111111111111' AND status='pending';
  ASSERT j.ready_at >= NOW() + INTERVAL '14 minutes', 'Cooldown was not enforced';
  UPDATE notification_jobs SET ready_at=NOW() WHERE id=j.id;
  SELECT * INTO j FROM claim_notification_jobs(5) WHERE id=j.id;
  ASSERT prepare_chat_notification(j.id,j.lease_token) IS NULL, 'Cooldown must defer';
  ASSERT (SELECT status FROM notification_jobs WHERE id=j.id)='pending';
  UPDATE chat_email_preferences SET last_sent_at=NOW()-INTERVAL '16 minutes';
  UPDATE chat_conversations SET seller_first_unread_at=NOW()-INTERVAL '4 minutes';
  UPDATE notification_jobs SET ready_at=NOW() WHERE id=j.id;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
SELECT chat_mark_read(current_setting('test.conversation')::UUID,9999);
RESET ROLE;
DO $$ DECLARE j notification_jobs; BEGIN
  FOR j IN SELECT * FROM claim_notification_jobs(5) WHERE kind='chat' LOOP
    ASSERT jsonb_array_length(prepare_chat_notification(j.id,j.lease_token))=0, 'Read-before-send must suppress email';
    PERFORM finish_notification_job(j.id,j.lease_token,'skipped');
  END LOOP;
END $$;
-- Multi-size stock is held and restored exactly once, including legacy RPCs.
INSERT INTO shoes (id,seller_id,inventory_mode) VALUES ('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111','multi');
INSERT INTO shoe_variants (id,shoe_id,size_eu,quantity) VALUES ('66666666-6666-4666-8666-666666666666','55555555-5555-4555-8555-555555555555',42,2);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
DO $$ DECLARE r purchase_requests; BEGIN
  r:=marketplace_submit_offer('55555555-5555-4555-8555-555555555555','dddddddd-dddd-4ddd-8ddd-ddddddddddd5',NULL,4500,'66666666-6666-4666-8666-666666666666');
  PERFORM set_config('test.multi_request',r.id::TEXT,true);
END $$;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
SELECT accept_purchase_request(current_setting('test.multi_request')::UUID);
SELECT accept_purchase_request(current_setting('test.multi_request')::UUID);
DO $$ BEGIN ASSERT (SELECT quantity FROM shoe_variants LIMIT 1)=1, 'Duplicate accept consumed extra stock'; END $$;
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
SELECT retract_purchase_request(current_setting('test.multi_request')::UUID);
SELECT retract_purchase_request(current_setting('test.multi_request')::UUID);
DO $$ BEGIN ASSERT (SELECT quantity FROM shoe_variants LIMIT 1)=2, 'Withdrawal restored stock incorrectly'; END $$;
RESET ROLE;
-- State changes enqueue expiry email before any worker can fail to deliver it.
INSERT INTO buyback_offers (id,listing_id,seller_id,status,expires_at,proposed_ship_date) VALUES ('77777777-7777-4777-8777-777777777777','44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','accepted',NOW()+INTERVAL '1 day',CURRENT_DATE);
SELECT queue_buyback_shipping_reminders();
SELECT queue_buyback_shipping_reminders();
UPDATE buyback_offers SET status='expired' WHERE id='77777777-7777-4777-8777-777777777777';
DO $$ BEGIN
  ASSERT (SELECT COUNT(*) FROM notification_jobs WHERE kind='buyback_expired')=1;
  ASSERT (SELECT COUNT(*) FROM notification_jobs WHERE kind='buyback_shipping')=1;
END $$;
DELETE FROM buyback_offers;
-- Lease replacement rejects an old worker, and retry snapshots stay immutable.
DO $$ DECLARE j notification_jobs; old_token UUID; first JSONB; BEGIN
  UPDATE notification_jobs SET ready_at=NOW(), status='pending', lease_token=NULL, lease_until=NULL WHERE kind='renewal';
  SELECT * INTO j FROM claim_notification_jobs(5) WHERE kind='renewal';
  old_token:=j.lease_token;
  UPDATE notification_jobs SET lease_until=NOW()-INTERVAL '1 second' WHERE id=j.id;
  SELECT * INTO j FROM claim_notification_jobs(5) WHERE kind='renewal';
  ASSERT j.lease_token<>old_token;
  BEGIN PERFORM finish_notification_job(j.id,old_token,'sent'); RAISE EXCEPTION 'Stale lease accepted';
  EXCEPTION WHEN raise_exception THEN ASSERT SQLERRM='Notification lease expired'; END;
  first:=notification_delivery_snapshot(j.id,j.lease_token,'{"html":"original","subject":"Original"}');
  ASSERT notification_delivery_snapshot(j.id,j.lease_token,'{"html":"changed"}')=first;
  PERFORM finish_notification_job(j.id,j.lease_token,'pending','Test retry');
  ASSERT (SELECT status FROM notification_jobs WHERE id=j.id)='pending';
  UPDATE notification_jobs SET ready_at=NOW(), payload=jsonb_set(payload,'{delivery,prepared_at}',to_jsonb(NOW()-INTERVAL '24 hours')) WHERE id=j.id;
  PERFORM * FROM claim_notification_jobs(5);
  ASSERT (SELECT status FROM notification_jobs WHERE id=j.id)='dead', 'An ambiguous delivery was retried beyond provider protection';
END $$;
DELETE FROM shoes WHERE id='44444444-4444-4444-8444-444444444444';
DO $$ BEGIN
  ASSERT EXISTS (SELECT 1 FROM chat_conversations WHERE listing_id IS NULL AND listing_key='44444444-4444-4444-8444-444444444444');
  ASSERT (SELECT COUNT(*) FROM chat_messages)>0;
END $$;
ROLLBACK;
\echo 'Messaging database checks passed'
