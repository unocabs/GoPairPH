import { NextResponse } from 'next/server';

// Retired entry points cannot create unverified placements after the cutover.
export async function POST() {
  return NextResponse.json({ error: 'This payment flow has been replaced. Refresh the listing to pay through PayMongo QR Ph or use GP Coins for Featured.' }, { status: 410 });
}
