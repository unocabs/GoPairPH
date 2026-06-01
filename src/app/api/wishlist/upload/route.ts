import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyTurnstile } from '@/lib/turnstile';

// Service-role-backed upload so anonymous posters can attach photos.
// The form sends one WebP blob per request. Returns the storage path.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });

  const file = form.get('file');
  const token = form.get('turnstileToken');

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const ok = await verifyTurnstile(typeof token === 'string' ? token : null, ip);
  if (!ok) return NextResponse.json({ error: 'Captcha verification failed' }, { status: 400 });

  const service = createServiceClient();
  const folder = `${crypto.randomUUID()}`;
  const path = `anon/wishlist/${folder}/${Date.now()}.webp`;

  const buffer = await file.arrayBuffer();
  const { error: upErr } = await service.storage
    .from('shoe-images')
    .upload(path, buffer, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  return NextResponse.json({ storage_path: path }, { status: 201 });
}
