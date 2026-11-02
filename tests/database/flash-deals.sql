INSERT INTO profiles(id,user_id,is_verified) VALUES
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',TRUE),
 ('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',TRUE),
 ('33333333-3333-4333-8333-333333333333','cccccccc-cccc-4ccc-8ccc-cccccccccccc',FALSE);
INSERT INTO shoes(id,seller_id) SELECT ('00000000-0000-4000-8000-'||lpad(i::TEXT,12,'0'))::UUID,
  CASE WHEN i<=3 THEN '11111111-1111-4111-8111-111111111111'::UUID ELSE '22222222-2222-4222-8222-222222222222'::UUID END FROM generate_series(1,6)i;
INSERT INTO shoe_images(shoe_id) SELECT id FROM shoes;
SELECT gp_coin_award('11111111-1111-4111-8111-111111111111',100,'flash_test_reward');
CREATE FUNCTION pg_temp.expect_failure(statement TEXT,pattern TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN BEGIN EXECUTE statement;RAISE EXCEPTION 'Expected failure did not occur';
 EXCEPTION WHEN OTHERS THEN ASSERT SQLERRM LIKE '%'||pattern||'%',SQLERRM; END;END $$;

BEGIN;
DO $$ DECLARE d flash_deals;again flash_deals;BEGIN
 PERFORM pg_temp.expect_failure($q$SELECT start_flash_deal('22222222-2222-4222-8222-222222222222','00000000-0000-4000-8000-000000000001',4400,gen_random_uuid())$q$,'Choose active');
 PERFORM pg_temp.expect_failure($q$SELECT start_flash_deal('33333333-3333-4333-8333-333333333333','00000000-0000-4000-8000-000000000001',4400,gen_random_uuid())$q$,'Verify');
 PERFORM pg_temp.expect_failure($q$SELECT start_flash_deal('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001',4600,gen_random_uuid())$q$,'at least');
 d:=start_flash_deal('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001',4400,'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
 again:=start_flash_deal(d.seller_id,d.listing_id,4400,d.client_id);
 ASSERT again.id=d.id;
 ASSERT (SELECT available_balance=80 FROM gp_coin_wallets WHERE profile_id=d.seller_id);
 ASSERT (SELECT price_php=5000 AND flash_deal_price_php=4400 FROM shoes WHERE id=d.listing_id);
 PERFORM pg_temp.expect_failure($q$SELECT start_flash_deal('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000002',4400,gen_random_uuid())$q$,'already have');
 PERFORM pg_temp.expect_failure($q$SELECT create_promotion_checkout('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','top_pick',7,0,FALSE)$q$,'End your flash');
 PERFORM end_flash_deal(d.seller_id,d.id);
 ASSERT (SELECT price_php=5000 AND flash_deal_id IS NULL FROM shoes WHERE id=d.listing_id);
 PERFORM pg_temp.expect_failure($q$SELECT start_flash_deal('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001',4400,gen_random_uuid())$q$,'once every 7');
END $$;
ROLLBACK;

BEGIN;
DO $$ BEGIN
 UPDATE shoes SET price_php=4000 WHERE id='00000000-0000-4000-8000-000000000001';
 UPDATE shoes SET price_php=6000 WHERE id='00000000-0000-4000-8000-000000000001';
 ASSERT flash_deal_reference_price('00000000-0000-4000-8000-000000000001')=4000;
 PERFORM pg_temp.expect_failure($q$SELECT start_flash_deal('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001',4400,gen_random_uuid())$q$,'at least');
 PERFORM start_flash_deal('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001',3500,gen_random_uuid());
 UPDATE shoes SET price_php=5500 WHERE id='00000000-0000-4000-8000-000000000001';
 ASSERT (SELECT flash_deal_id IS NULL AND price_php=5500 FROM shoes WHERE id='00000000-0000-4000-8000-000000000001');
END $$;
ROLLBACK;

BEGIN;
DO $$ DECLARE p JSONB;purchase_id UUID;BEGIN
 PERFORM pg_temp.expect_failure($q$SELECT create_gp_coin_purchase('11111111-1111-4111-8111-111111111111',999,FALSE,'/profile')$q$,'Invalid');
 p:=create_gp_coin_purchase('11111111-1111-4111-8111-111111111111',100,FALSE,'/flash-deals/new');purchase_id:=(p->>'id')::UUID;
 ASSERT p->>'create_checkout'='true' AND (p->>'amount_minor')::INTEGER=5000;
 ASSERT create_gp_coin_purchase('11111111-1111-4111-8111-111111111111',40,FALSE,'/profile')->>'id'=purchase_id::TEXT;
 ASSERT (SELECT available_balance=100 FROM gp_coin_wallets WHERE profile_id='11111111-1111-4111-8111-111111111111');
 PERFORM attach_gp_coin_checkout(purchase_id,'cs_coins','https://checkout.paymongo.com/coins',FALSE);
 PERFORM pg_temp.expect_failure(format('SELECT fulfill_gp_coin_purchase(%L,%L,%L,1,%L,FALSE)',purchase_id,'cs_coins','pay_coins','PHP'),'mismatch');
 PERFORM fulfill_gp_coin_purchase(purchase_id,'cs_coins','pay_coins',5000,'PHP',FALSE);
 PERFORM fulfill_gp_coin_purchase(purchase_id,'cs_coins','pay_coins',5000,'PHP',FALSE);
 ASSERT (SELECT available_balance=200 FROM gp_coin_wallets WHERE profile_id='11111111-1111-4111-8111-111111111111');
 ASSERT (SELECT COUNT(*)=1 FROM gp_coin_transactions WHERE metadata->>'action'='coin_purchase');
 ASSERT (SELECT expires_at='infinity'::TIMESTAMPTZ FROM gp_coin_award_buckets WHERE source_transaction_id=(SELECT credit_transaction_id FROM gp_coin_purchases WHERE id=purchase_id));
 PERFORM record_gp_coin_purchase_refund('pay_coins','ref_partial',1000,FALSE);
 PERFORM record_gp_coin_purchase_refund('pay_coins','ref_partial',1000,FALSE);
 ASSERT (SELECT available_balance=180 FROM gp_coin_wallets WHERE profile_id='11111111-1111-4111-8111-111111111111');
 PERFORM record_gp_coin_purchase_refund('pay_coins','ref_rest',4000,FALSE);
 ASSERT (SELECT available_balance=100 FROM gp_coin_wallets WHERE profile_id='11111111-1111-4111-8111-111111111111');
 ASSERT (SELECT status='refunded' FROM gp_coin_purchases WHERE gp_coin_purchases.id=purchase_id);
END $$;
ROLLBACK;

BEGIN;
SELECT start_flash_deal('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001',4400,gen_random_uuid());
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',TRUE);
SELECT marketplace_submit_offer('00000000-0000-4000-8000-000000000001',gen_random_uuid(),NULL,4400);
DO $$ BEGIN ASSERT (SELECT listed_price_php=4400 AND offer_price_php=4400 FROM purchase_requests LIMIT 1); END $$;
UPDATE shoes SET flash_deal_starts_at=NOW()-INTERVAL '25 hours',flash_deal_ends_at=NOW()-INTERVAL '1 hour' WHERE id='00000000-0000-4000-8000-000000000001';
SELECT set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-cccccccccccc',TRUE);
SELECT pg_temp.expect_failure($q$SELECT marketplace_submit_offer('00000000-0000-4000-8000-000000000001',gen_random_uuid(),NULL,4400)$q$,'fixed price');
SELECT marketplace_submit_offer('00000000-0000-4000-8000-000000000001',gen_random_uuid(),NULL,5000);
ROLLBACK;

-- Browser roles cannot grant coins, mutate a flash window, or read another wallet order.
BEGIN;
DO $$ DECLARE p JSONB;purchase_id UUID;BEGIN
 p:=create_gp_coin_purchase('22222222-2222-4222-8222-222222222222',40,FALSE,'/profile');purchase_id:=(p->>'id')::UUID;
 PERFORM fulfill_gp_coin_purchase(purchase_id,'cs_spent','pay_spent',2000,'PHP',FALSE);
 PERFORM start_flash_deal('22222222-2222-4222-8222-222222222222','00000000-0000-4000-8000-000000000004',4400,gen_random_uuid());
 PERFORM record_gp_coin_purchase_refund('pay_spent','ref_spent',2000,FALSE);
 PERFORM record_gp_coin_purchase_refund('pay_spent','ref_spent',2000,FALSE);
 ASSERT (SELECT available_balance=-20 AND locked_at IS NOT NULL FROM gp_coin_wallets WHERE profile_id='22222222-2222-4222-8222-222222222222');
 PERFORM pg_temp.expect_failure($q$SELECT gp_coin_apply_transaction('22222222-2222-4222-8222-222222222222','hold',-10,10,'locked_test')$q$,'payment review');
END $$;
ROLLBACK;

BEGIN;
DO $$ DECLARE p JSONB;promotion JSONB;BEGIN
 p:=create_gp_coin_purchase('22222222-2222-4222-8222-222222222222',100,FALSE,'/profile');
 PERFORM fulfill_gp_coin_purchase((p->>'id')::UUID,'cs_featuredcredits','pay_featuredcredits',5000,'PHP',FALSE);
 promotion:=create_promotion_checkout('22222222-2222-4222-8222-222222222222','00000000-0000-4000-8000-000000000004','featured',7,100,FALSE);
 PERFORM fulfill_promotion_payment((promotion->>'id')::UUID,NULL,NULL,0,'PHP',FALSE,'test_featured_refund','gp_coins');
 PERFORM refund_featured_payment_coins((promotion->>'featured_order_id')::UUID);
 ASSERT EXISTS(SELECT 1 FROM gp_coin_award_buckets b JOIN gp_coin_transactions t ON t.id=b.source_transaction_id
   WHERE t.transaction_type='refund' AND b.expires_at='infinity'::TIMESTAMPTZ);
END $$;
ROLLBACK;

SELECT create_gp_coin_purchase('11111111-1111-4111-8111-111111111111',40,FALSE,'/profile');
SELECT create_gp_coin_purchase('22222222-2222-4222-8222-222222222222',40,FALSE,'/profile');
GRANT USAGE ON SCHEMA public,auth TO authenticated;
GRANT SELECT ON profiles,shoes TO authenticated;
GRANT UPDATE ON shoes TO authenticated;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',FALSE);
SELECT pg_temp.expect_failure($q$SELECT create_gp_coin_purchase('22222222-2222-4222-8222-222222222222',100,FALSE,'/profile')$q$,'permission denied');
SELECT pg_temp.expect_failure($q$UPDATE shoes SET flash_deal_id=gen_random_uuid() WHERE id='00000000-0000-4000-8000-000000000004'$q$,'Use Start');
DO $$ BEGIN ASSERT (SELECT COUNT(*)=1 FROM gp_coin_purchases);
 ASSERT NOT EXISTS(SELECT 1 FROM gp_coin_purchases WHERE profile_id='11111111-1111-4111-8111-111111111111'); END $$;
RESET ROLE;
