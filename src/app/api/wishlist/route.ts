import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { wishlistSchema } from '@/lib/validations';
import { verifyTurnstile } from '@/lib/turnstile';

const bodySchema = z.object({
  data: wishlistSchema,
  turnstileToken: z.string().min(1, 'Missing captcha token'),
  images: z.array(z.object({ storage_path: z.string() })).max(5).optional().default([]),
});

export async function POST(request: Request) {
  let parsed;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const ok = await verifyTurnstile(parsed.turnstileToken, ip);
  if (!ok) {
    return NextResponse.json({ error: 'Captcha verification failed. Please try again.' }, { status: 400 });
  }

  // Resolve the optional posting profile (anonymous is allowed).
  let posterProfileId: string | null = null;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    posterProfileId = prof?.id ?? null;
  }

  const service = createServiceClient();
  const { brand, model, color, size_eu, size_us, size_cm, price_min_php, price_max_php, description, location } = parsed.data;

  const { data: inserted, error: insertErr } = await service
    .from('wishlist_items')
    .insert({
      user_id: posterProfileId,
      brand,
      model,
      color: color || null,
      size_eu: size_eu ?? null,
      size_us: size_us ?? null,
      size_cm: size_cm ?? null,
      price_min_php: price_min_php ?? null,
      price_max_php: price_max_php ?? null,
      description: description || null,
      location: location || null,
    })
    .select('id')
    .single();

  if (insertErr || !inserted) {
    return NextResponse.json({ error: insertErr?.message ?? 'Failed to create wishlist item' }, { status: 400 });
  }

  if (parsed.images.length > 0) {
    const rows = parsed.images.map((img, i) => ({
      wishlist_id: inserted.id,
      storage_path: img.storage_path,
      order: i,
    }));
    const { error: imgErr } = await service.from('wishlist_images').insert(rows);
    if (imgErr) {
      console.error('[wishlist] image rows insert failed:', imgErr);
    }
  }

  return NextResponse.json({ id: inserted.id }, { status: 201 });
}
