\set ON_ERROR_STOP on
-- Local integration assertions. Requires payment-fixture.sql and 044/045/050/053.
INSERT INTO profiles(id,user_id,is_verified) VALUES
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',TRUE),
 ('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',TRUE),
 ('33333333-3333-4333-8333-333333333333','cccccccc-cccc-4ccc-8ccc-cccccccccccc',FALSE);
INSERT INTO shoes(id,seller_id) SELECT ('00000000-0000-4000-8000-' || lpad(i::TEXT,12,'0'))::UUID,
  CASE WHEN i <= 5 THEN '11111111-1111-4111-8111-111111111111'::UUID ELSE '22222222-2222-4222-8222-222222222222'::UUID END FROM generate_series(1,8) i;
CREATE FUNCTION pg_temp.expect_failure(statement TEXT, pattern TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE statement; RAISE EXCEPTION 'Expected failure did not occur';
  EXCEPTION WHEN OTHERS THEN ASSERT SQLERRM LIKE '%' || pattern || '%', SQLERRM; END;
END $$;

BEGIN;
DO $$ DECLARE p JSONB; again JSONB; BEGIN
  PERFORM pg_temp.expect_failure($q$SELECT create_promotion_checkout('33333333-3333-4333-8333-333333333333','00000000-0000-4000-8000-000000000001','featured',7,0,FALSE)$q$,'verified');
  PERFORM pg_temp.expect_failure($q$SELECT create_promotion_checkout('22222222-2222-4222-8222-222222222222','00000000-0000-4000-8000-000000000001','featured',7,0,FALSE)$q$,'eligible');
  PERFORM pg_temp.expect_failure($q$SELECT create_promotion_checkout('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','featured',7,0,TRUE)$q$,'environment');
  p := create_promotion_checkout('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','featured',7,0,FALSE);
  ASSERT (p->>'amount_minor')::INTEGER = 5000;
  ASSERT p->>'status' = 'creating';
  ASSERT (SELECT status = 'reserved' FROM featured_promotion_orders WHERE id=(p->>'featured_order_id')::UUID);
  ASSERT (SELECT featured_until IS NULL FROM shoes WHERE id=(p->>'listing_id')::UUID);
  again := create_promotion_checkout('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','featured',7,0,FALSE);
  ASSERT again->>'id' = p->>'id' AND again->>'create_checkout' = 'false';
  PERFORM pg_temp.expect_failure($q$SELECT create_promotion_checkout('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','featured',30,0,FALSE)$q$,'checkout already');
END $$;
ROLLBACK;

BEGIN;
DO $$ DECLARE p JSONB; finish TIMESTAMPTZ; BEGIN
  p := create_promotion_checkout('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','featured',7,0,FALSE);
  PERFORM attach_promotion_checkout((p->>'id')::UUID,'cs_featured','https://checkout.paymongo.com/featured',FALSE);
  PERFORM pg_temp.expect_failure(format('SELECT fulfill_promotion_payment(%L,%L,%L,1,%L,FALSE,%L,NULL)',p->>'id','cs_featured','pay_featured','PHP','evt_bad'),'mismatch');
  PERFORM pg_temp.expect_failure(format('SELECT fulfill_promotion_payment(%L,%L,%L,5000,%L,TRUE,%L,NULL)',p->>'id','cs_featured','pay_featured','PHP','evt_bad'),'mismatch');
  PERFORM pg_temp.expect_failure(format('SELECT fulfill_promotion_payment(%L,%L,%L,5000,%L,FALSE,%L,NULL)',p->>'id','cs_wrong','pay_featured','PHP','evt_bad'),'mismatch');
  PERFORM fulfill_promotion_payment((p->>'id')::UUID,'cs_featured','pay_featured',5000,'PHP',FALSE,'evt_featured','qrph');
  SELECT scheduled_end_at INTO finish FROM featured_promotion_orders WHERE id=(p->>'featured_order_id')::UUID;
  ASSERT (SELECT status='paid' FROM promotion_payments WHERE id=(p->>'id')::UUID);
  PERFORM fulfill_promotion_payment((p->>'id')::UUID,'cs_featured','pay_featured',5000,'PHP',FALSE,'evt_featured','qrph');
  PERFORM fulfill_promotion_payment((p->>'id')::UUID,'cs_featured','pay_featured',5000,'PHP',FALSE,'evt_different','qrph');
  ASSERT finish = (SELECT scheduled_end_at FROM featured_promotion_orders WHERE id=(p->>'featured_order_id')::UUID);
  ASSERT (SELECT COUNT(*)=1 FROM featured_promotion_orders WHERE status='active');
END $$;
ROLLBACK;

BEGIN;
DO $$ DECLARE p JSONB; f UUID; BEGIN
  PERFORM gp_coin_award('11111111-1111-4111-8111-111111111111',200,'test_reward');
  p := create_promotion_checkout('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','featured',7,20,FALSE);
  f := (p->>'featured_order_id')::UUID;
  ASSERT (p->>'amount_minor')::INTEGER=4000;
  ASSERT (SELECT available_balance=180 AND reserved_balance=20 FROM gp_coin_wallets WHERE profile_id=(p->>'seller_id')::UUID);
  UPDATE featured_promotion_orders SET reserved_until=NOW()-INTERVAL '1 hour' WHERE id=f;
  PERFORM gp_coin_release_expired_featured_reservations();
  ASSERT (SELECT status='reserved' AND coins_released_at IS NULL FROM featured_promotion_orders WHERE id=f);
  PERFORM fulfill_promotion_payment((p->>'id')::UUID,'cs_mixed','pay_mixed',4000,'PHP',FALSE,'evt_mixed','qrph');
  PERFORM fulfill_promotion_payment((p->>'id')::UUID,'cs_mixed','pay_mixed',4000,'PHP',FALSE,'evt_mixed2','qrph');
  ASSERT (SELECT available_balance=180 AND reserved_balance=0 FROM gp_coin_wallets WHERE profile_id=(p->>'seller_id')::UUID);
  ASSERT (SELECT COUNT(*)=1 FROM gp_coin_transactions WHERE transaction_type='spend');
  PERFORM record_promotion_refund('pay_mixed','ref_part',1000,FALSE);
  ASSERT (SELECT status='review' AND refunded_amount_minor=1000 FROM promotion_payments WHERE id=(p->>'id')::UUID);
  PERFORM record_promotion_refund('pay_mixed','ref_part',1000,FALSE);
  PERFORM record_promotion_refund('pay_mixed','ref_rest',3000,FALSE);
  PERFORM record_promotion_refund('pay_mixed','ref_rest',3000,FALSE);
  ASSERT (SELECT status='refunded' AND refunded_amount_minor=4000 FROM promotion_payments WHERE id=(p->>'id')::UUID);
  ASSERT (SELECT available_balance=200 AND reserved_balance=0 FROM gp_coin_wallets WHERE profile_id=(p->>'seller_id')::UUID);
  ASSERT (SELECT COUNT(*)=1 FROM gp_coin_transactions WHERE transaction_type='refund');
  ASSERT (SELECT featured_until IS NULL FROM shoes WHERE id=(p->>'listing_id')::UUID);
END $$;
ROLLBACK;

BEGIN;
DO $$ DECLARE p JSONB; again JSONB; BEGIN
  PERFORM gp_coin_award('11111111-1111-4111-8111-111111111111',300,'test_reward');
  p := create_promotion_checkout('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','featured',7,100,FALSE);
  ASSERT p->>'provider'='gp_coins' AND (p->>'amount_minor')::INTEGER=0;
  PERFORM pg_temp.expect_failure($q$SELECT create_promotion_checkout('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000002','featured',7,100,FALSE)$q$,'once every 30');
  PERFORM fulfill_promotion_payment((p->>'id')::UUID,NULL,NULL,0,'PHP',FALSE,'coins_test','gp_coins');
  ASSERT (SELECT status='paid' AND provider_checkout_id IS NULL FROM promotion_payments WHERE id=(p->>'id')::UUID);
END $$;
ROLLBACK;

BEGIN;
DO $$ DECLARE p JSONB; BEGIN
  PERFORM gp_coin_award('11111111-1111-4111-8111-111111111111',100,'test_reward');
  p := create_promotion_checkout('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','featured',7,20,FALSE);
  PERFORM attach_promotion_checkout((p->>'id')::UUID,'cs_expired','https://checkout.paymongo.com/expired',FALSE);
  PERFORM expire_promotion_payment((p->>'id')::UUID,'cs_expired',FALSE);
  PERFORM expire_promotion_payment((p->>'id')::UUID,'cs_expired',FALSE);
  ASSERT (SELECT available_balance=100 AND reserved_balance=0 FROM gp_coin_wallets WHERE profile_id=(p->>'seller_id')::UUID);
  PERFORM fulfill_promotion_payment((p->>'id')::UUID,'cs_expired','pay_late',4000,'PHP',FALSE,'evt_late','qrph');
  ASSERT (SELECT status='review' AND paid_at IS NOT NULL FROM promotion_payments WHERE id=(p->>'id')::UUID);
  ASSERT (SELECT status='refund_required' FROM featured_promotion_orders WHERE id=(p->>'featured_order_id')::UUID);
  ASSERT (SELECT featured_until IS NULL FROM shoes WHERE id=(p->>'listing_id')::UUID);
END $$;
ROLLBACK;

BEGIN;
DO $$ DECLARE p JSONB; slots JSONB; BEGIN
  p := create_promotion_checkout('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','top_pick',7,0,FALSE);
  slots := get_sponsored_payment_slot_info();
  ASSERT slots->>'slotsAvailable'='false';
  PERFORM pg_temp.expect_failure($q$SELECT create_promotion_checkout('22222222-2222-4222-8222-222222222222','00000000-0000-4000-8000-000000000006','top_pick',7,0,FALSE)$q$,'slots are full');
  PERFORM fulfill_promotion_payment((p->>'id')::UUID,'cs_top','pay_top',3000,'PHP',FALSE,'evt_top','gcash');
  ASSERT (SELECT sponsored_until > NOW() FROM shoes WHERE id=(p->>'listing_id')::UUID);
  PERFORM record_promotion_refund('pay_top','ref_top',3000,FALSE);
  ASSERT (SELECT sponsored_until IS NULL FROM shoes WHERE id=(p->>'listing_id')::UUID);
  ASSERT get_sponsored_payment_slot_info()->>'slotsAvailable'='true';
END $$;
ROLLBACK;

BEGIN;
DO $$ DECLARE p JSONB; BEGIN
  p := create_promotion_checkout('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','top_pick',7,0,FALSE);
  UPDATE shoes SET status='sold' WHERE id=(p->>'listing_id')::UUID;
  PERFORM fulfill_promotion_payment((p->>'id')::UUID,'cs_closed','pay_closed',3000,'PHP',FALSE,'evt_closed','qrph');
  ASSERT (SELECT status='review' AND paid_at IS NOT NULL FROM promotion_payments WHERE id=(p->>'id')::UUID);
  ASSERT (SELECT sponsored_until IS NULL FROM shoes WHERE id=(p->>'listing_id')::UUID);
END $$;
ROLLBACK;

BEGIN;
DO $$ DECLARE first JSONB; queued JSONB; BEGIN
  PERFORM gp_coin_award('11111111-1111-4111-8111-111111111111',100,'test_reward');
  first := create_promotion_checkout('22222222-2222-4222-8222-222222222222','00000000-0000-4000-8000-000000000006','featured',7,0,FALSE);
  PERFORM fulfill_promotion_payment((first->>'id')::UUID,'cs_first','pay_first',5000,'PHP',FALSE,'evt_first','qrph');
  queued := create_promotion_checkout('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','featured',7,20,FALSE);
  PERFORM fulfill_promotion_payment((queued->>'id')::UUID,'cs_queue','pay_queue',4000,'PHP',FALSE,'evt_queue','qrph');
  ASSERT (SELECT status='queued' FROM featured_promotion_orders WHERE id=(queued->>'featured_order_id')::UUID);
  UPDATE shoes SET status='sold' WHERE id=(queued->>'listing_id')::UUID;
  PERFORM reconcile_promotion_payment_placements();
  ASSERT (SELECT status='review' FROM promotion_payments WHERE id=(queued->>'id')::UUID);
  ASSERT (SELECT available_balance=100 FROM gp_coin_wallets WHERE profile_id=(queued->>'seller_id')::UUID);
  PERFORM record_promotion_refund('pay_queue','ref_queue',4000,FALSE);
  ASSERT (SELECT COUNT(*)=1 FROM gp_coin_transactions WHERE transaction_type='refund');
END $$;
ROLLBACK;

DO $$ BEGIN
  ASSERT NOT has_function_privilege('authenticated','fulfill_promotion_payment(uuid,text,text,integer,text,boolean,text,text)','EXECUTE');
  ASSERT NOT has_function_privilege('anon','create_promotion_checkout(uuid,uuid,text,integer,integer,boolean)','EXECUTE');
  ASSERT NOT has_function_privilege('authenticated','submit_featured_payment_proof(uuid,featured_payment_method,text,text)','EXECUTE');
  ASSERT NOT has_function_privilege('authenticated','create_featured_paid_reservation(uuid,integer,integer)','EXECUTE');
  ASSERT NOT has_function_privilege('authenticated','gp_coin_release_featured_order(uuid,text)','EXECUTE');
  ASSERT NOT has_function_privilege('authenticated','gp_coin_spend_featured_order(uuid)','EXECUTE');
  ASSERT has_function_privilege('service_role','fulfill_promotion_payment(uuid,text,text,integer,text,boolean,text,text)','EXECUTE');
  ASSERT NOT has_table_privilege('anon','promotion_payments','SELECT');
  ASSERT NOT has_table_privilege('authenticated','promotion_payments','UPDATE');
END $$;
\echo 'Payment database integration assertions passed.'
