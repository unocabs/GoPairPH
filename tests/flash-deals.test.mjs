import test from 'node:test';
import assert from 'node:assert/strict';
import { COIN_PACKS, coinReturnPath, flashDealTimeLeft, isFlashDealLive, maxFlashDealPrice, withFlashDealPrice } from '../src/lib/flashDeals.ts';
const now=Date.parse('2026-11-02T10:00:00Z');
const shoe={price_php:5000,status:'active',has_stock:true,flash_deal_id:'deal',flash_deal_original_price_php:4900,flash_deal_price_php:4400,
 flash_deal_starts_at:new Date(now-3600000).toISOString(),flash_deal_ends_at:new Date(now+3600000).toISOString()};
test('live discounts apply consistently, preserve asking price, and expire exactly without a scheduled job',()=>{
 assert.equal(isFlashDealLive(shoe,now),true);
 const live=withFlashDealPrice(shoe,now);assert.equal(live.price_php,4400);assert.equal(shoe.price_php,5000);
 assert.equal(withFlashDealPrice(live,now).price_php,4400);
 assert.equal(withFlashDealPrice(live,now+3600000).price_php,5000);
 assert.equal(isFlashDealLive(shoe,now+3600000),false);
});
test('closed, out-of-stock, future and invalid discounts cannot present as live',()=>{
 for(const change of [{status:'sold'},{status:'reserved'},{has_stock:false},{flash_deal_price_php:5000},{flash_deal_price_php:0},{flash_deal_starts_at:new Date(now+100).toISOString()}])assert.equal(isFlashDealLive({...shoe,...change},now),false);
});
test('prices use the reference minimum and never round up beyond 10 percent off',()=>{
 assert.equal(maxFlashDealPrice(4900),4410);assert.equal(maxFlashDealPrice(123.45),111.1);
 assert.equal(flashDealTimeLeft(shoe.flash_deal_ends_at,now),'Ends in 1h 0m');
 assert.equal(flashDealTimeLeft(shoe.flash_deal_ends_at,now+3600000),'Deal ended');
});
test('coin packs retain the existing two-coins-per-peso conversion with no hidden bonuses',()=>{
 for(const pack of COIN_PACKS)assert.equal(pack.coins,pack.pricePhp*2);
});
test('coin return paths preserve a valid seller draft and reject external or malformed destinations',()=>{
 const path='/flash-deals/new?listing=11111111-1111-4111-8111-111111111111&sale=4400';
 assert.equal(coinReturnPath(path),path);
 for(const bad of ['//evil.com','https://evil.com','/\\evil.com','/admin','javascript:alert(1)','/flash-deals/new\r\nLocation:evil',null])assert.equal(coinReturnPath(bad),'/profile');
 assert.equal(coinReturnPath('/flash-deals/new?sale=oops&listing=invalid&other=hidden'),'/flash-deals/new');
});
