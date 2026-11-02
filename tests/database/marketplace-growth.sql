BEGIN;
CREATE FUNCTION public.growth_assert(condition BOOLEAN, message TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN IF condition IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'Assertion failed: %', message; END IF; END $$;
SELECT growth_assert((SELECT running_relevance_flagged FROM shoes WHERE model='Lebron XXII'), 'backfill explicit basketball model');
SELECT growth_assert(NOT (SELECT running_relevance_flagged FROM shoes WHERE model='Pegasus 41'), 'normal running shoes unaffected');
SELECT growth_assert((SELECT bool_and(updated_at = '2001-01-01'::TIMESTAMPTZ) FROM shoes), 'backfill must not change freshness dates');
SELECT growth_assert(running_shoe_review_reason('Asics','Gel-Kayano 31') IS NULL AND running_shoe_review_reason('Other','Unknown model') IS NULL
  AND running_shoe_review_reason('Nike','Jordan trail runner') IS NULL, 'uncertain names are not automatically flagged');
SELECT growth_assert(running_shoe_review_reason('Nike','kd19') IS NOT NULL AND running_shoe_review_reason('Nike','Air Jordan 1 Retro') IS NOT NULL, 'known basketball model hints');

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',TRUE);
SELECT growth_assert((SELECT count(*)=0 FROM listing_running_reviews), 'other buyers cannot read private review notes');
DO $$ DECLARE denied BOOLEAN := FALSE; BEGIN
  BEGIN PERFORM review_running_shoe('00000000-0000-4000-8000-000000000011','appeal','These are running shoes, please review.'); EXCEPTION WHEN OTHERS THEN denied := TRUE; END;
  PERFORM growth_assert(denied,'only owner can appeal');
  denied := FALSE;
  BEGIN PERFORM review_running_shoe('00000000-0000-4000-8000-000000000011','approve',''); EXCEPTION WHEN OTHERS THEN denied := TRUE; END;
  PERFORM growth_assert(denied,'buyers cannot approve');
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',TRUE);
SELECT growth_assert((SELECT count(*)=1 FROM listing_running_reviews), 'owner can read own private review');
UPDATE shoes SET running_relevance_flagged=FALSE, model='Renamed shoe' WHERE id='00000000-0000-4000-8000-000000000011';
SELECT growth_assert((SELECT running_relevance_flagged FROM shoes WHERE id='00000000-0000-4000-8000-000000000011'), 'owner cannot evade flag by editing or clearing bit');
SELECT review_running_shoe('00000000-0000-4000-8000-000000000011','appeal','Please review the brand page and running specification for these shoes.');
SELECT growth_assert((SELECT status='appealed' FROM listing_running_reviews WHERE listing_id='00000000-0000-4000-8000-000000000011'), 'appeal persists');
SELECT growth_assert((SELECT running_relevance_flagged FROM shoes WHERE id='00000000-0000-4000-8000-000000000011'), 'appeal does not self-approve');
RESET ROLE;
DO $$ DECLARE denied BOOLEAN := FALSE; BEGIN
  BEGIN INSERT INTO promotion_payments(seller_id,listing_id,livemode,provider,paid_at,amount_minor)
    VALUES ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011',TRUE,'paymongo',NULL,5000);
    EXCEPTION WHEN OTHERS THEN denied := TRUE; END;
  PERFORM growth_assert(denied,'flagged listing cannot pay for an unavailable placement');
END $$;
SET ROLE authenticated;
DO $$ DECLARE denied BOOLEAN := FALSE; BEGIN
  BEGIN UPDATE listing_running_reviews SET status='approved'; EXCEPTION WHEN insufficient_privilege THEN denied := TRUE; END;
  PERFORM growth_assert(denied,'owner cannot edit private review state directly');
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',TRUE);
SELECT growth_assert((SELECT count(*)=1 FROM listing_running_reviews), 'admin can read appeals');
SELECT review_running_shoe('00000000-0000-4000-8000-000000000011','keep_flagged','The supplied reference still describes basketball use.');
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',TRUE);
SELECT review_running_shoe('00000000-0000-4000-8000-000000000011','appeal','Additional evidence: please check this running-specific manufacturer reference.');
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',TRUE);
SELECT review_running_shoe('00000000-0000-4000-8000-000000000011','approve','Running use confirmed.');
RESET ROLE;
SELECT growth_assert(NOT (SELECT running_relevance_flagged FROM shoes WHERE id='00000000-0000-4000-8000-000000000011'), 'approval restores priority');
UPDATE shoes SET model='Lebron XXII' WHERE id='00000000-0000-4000-8000-000000000011';
SELECT growth_assert((SELECT running_relevance_flagged FROM shoes WHERE id='00000000-0000-4000-8000-000000000011'), 'new identity requires a new review');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',TRUE);
SELECT review_running_shoe('00000000-0000-4000-8000-000000000011','approve','Approved despite automatic name hint.');
RESET ROLE;
UPDATE shoes SET brand=brand, running_relevance_flagged=TRUE WHERE id='00000000-0000-4000-8000-000000000011';
SELECT growth_assert(NOT (SELECT running_relevance_flagged FROM shoes WHERE id='00000000-0000-4000-8000-000000000011'), 'approval survives automatic hint and unchanged identity');
UPDATE shoes SET quality_flagged_at=NOW() WHERE id='00000000-0000-4000-8000-000000000012';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',TRUE);
SELECT review_running_shoe('00000000-0000-4000-8000-000000000012','flag','Manual model review requested.');
SELECT review_running_shoe('00000000-0000-4000-8000-000000000012','approve','Running model confirmed.');
RESET ROLE;
SELECT growth_assert((SELECT quality_flagged_at IS NOT NULL FROM shoes WHERE id='00000000-0000-4000-8000-000000000012'), 'independent quality flag preserved');
SELECT growth_assert(NOT has_table_privilege('anon','listing_running_reviews','SELECT'), 'anonymous reviews inaccessible');
SELECT growth_assert(NOT has_function_privilege('authenticated','marketplace_funnel_overview(integer)','EXECUTE'), 'funnel is service-only');
SELECT growth_assert(NOT has_table_privilege('authenticated','marketplace_analytics_exclusions','SELECT'), 'test exclusions private');

INSERT INTO shoes (id,seller_id,brand,model) VALUES
 ('00000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000001','Asics','Novablast 5'),
 ('00000000-0000-4000-8000-000000000014','00000000-0000-4000-8000-000000000004','Nike','Test inventory'),
 ('00000000-0000-4000-8000-000000000015','00000000-0000-4000-8000-000000000003','Nike','Admin inventory');
INSERT INTO marketplace_analytics_exclusions(profile_id) VALUES ('00000000-0000-4000-8000-000000000004');
INSERT INTO shoes (id,seller_id,brand,model,listing_type) VALUES
 ('00000000-0000-4000-8000-000000000016','00000000-0000-4000-8000-000000000001','Nike','Free shoes','donate');
INSERT INTO listing_daily_views(listing_id,created_at,view_date) VALUES
 ('00000000-0000-4000-8000-000000000016',NOW()-INTERVAL '2 days',(NOW() AT TIME ZONE 'Asia/Manila')::DATE-2);
INSERT INTO purchase_requests(listing_id,buyer_id,status,created_at) VALUES
 ('00000000-0000-4000-8000-000000000016','00000000-0000-4000-8000-000000000002','completed',NOW()-INTERVAL '1 day');
INSERT INTO listing_daily_views(listing_id,created_at,view_date,viewer_profile_id) VALUES
 ('00000000-0000-4000-8000-000000000012',NOW()-INTERVAL '2 days',(NOW() AT TIME ZONE 'Asia/Manila')::DATE-2,NULL),
 ('00000000-0000-4000-8000-000000000013',NOW()-INTERVAL '1 day',(NOW() AT TIME ZONE 'Asia/Manila')::DATE-1,NULL),
 ('00000000-0000-4000-8000-000000000014',NOW(),(NOW() AT TIME ZONE 'Asia/Manila')::DATE,NULL),
 ('00000000-0000-4000-8000-000000000015',NOW(),(NOW() AT TIME ZONE 'Asia/Manila')::DATE,NULL),
 ('00000000-0000-4000-8000-000000000012',NOW(),(NOW() AT TIME ZONE 'Asia/Manila')::DATE,'00000000-0000-4000-8000-000000000004');
INSERT INTO chat_conversations(id,listing_id,buyer_id,seller_id) VALUES
 ('00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000022','00000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000023','00000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001');
INSERT INTO chat_messages(conversation_id,sender_id,kind,created_at) VALUES
 ('00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000002','text',NOW()-INTERVAL '1 day'),
 ('00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000001','text',NOW()-INTERVAL '12 hours'),
 ('00000000-0000-4000-8000-000000000022','00000000-0000-4000-8000-000000000002','text',NOW()-INTERVAL '2 days'),
 ('00000000-0000-4000-8000-000000000023','00000000-0000-4000-8000-000000000004','text',NOW()-INTERVAL '1 hour');
INSERT INTO purchase_requests(listing_id,buyer_id,status,created_at) VALUES
 ('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000002','completed',NOW()-INTERVAL '1 day');
INSERT INTO promotion_payments(seller_id,listing_id,livemode,provider,paid_at,amount_minor,refunded_amount_minor,coins_used) VALUES
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000012',TRUE,'paymongo',NOW(),5000,1000,20),
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000012',TRUE,'gp_coins',NOW(),0,0,100),
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000012',FALSE,'paymongo',NOW(),9000,0,0),
 ('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000014',TRUE,'paymongo',NOW(),9000,0,0);
INSERT INTO estimator_payments(user_id,livemode,paid_at,amount_minor,refunded_amount_minor) VALUES
 ('10000000-0000-4000-8000-000000000001',TRUE,NOW(),5000,500),
 ('10000000-0000-4000-8000-000000000003',TRUE,NOW(),9000,0),
 ('10000000-0000-4000-8000-000000000004',TRUE,NOW(),9000,0),
 ('10000000-0000-4000-8000-000000000001',FALSE,NOW(),9000,0);
SET ROLE service_role;
DO $$ DECLARE r JSONB; BEGIN
  r := marketplace_funnel_overview(30);
  PERFORM growth_assert((r->>'viewed_listings')::INTEGER=2 AND (r->>'view_events')::INTEGER=2,'exclude test and admin inventory/views');
  PERFORM growth_assert((r->>'inquiry_listings')::INTEGER=1,'inquiries before the cohort view do not convert');
  PERFORM growth_assert((r->>'other_inquiry_listings')::INTEGER=1,'show inquiries outside the viewed cohort separately');
  PERFORM growth_assert((r->>'replied_listings')::INTEGER=1 AND (r->>'sold_listings')::INTEGER=1,'reply and completed-sale funnel');
  PERFORM growth_assert((r->>'promotion_cash_minor')::INTEGER=4000 AND (r->>'estimator_cash_minor')::INTEGER=4500,'cash net of refunds, excludes tests');
  PERFORM growth_assert((r->>'coins_applied')::INTEGER=120 AND (r->>'cash_paying_accounts')::INTEGER=1,'coins separate, cash accounts deduplicate across products');
  PERFORM growth_assert((r->>'test_paid_payments')::INTEGER=2 AND (r->>'cash_refunded_minor')::INTEGER=1500,'test mode and refunds distinct');
END $$;
ROLLBACK;
