import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const visibilitySchema = z.object({
  showHomepageActivityPublicly: z.boolean(),
});

async function getCurrentProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_admin')
    .eq('user_id', user.id)
    .maybeSingle();

  return (profile as { id: string; is_admin: boolean } | null) ?? null;
}

export async function PATCH(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  let parsed: z.infer<typeof visibilitySchema>;
  try {
    parsed = visibilitySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const service = createServiceClient();
  const { error } = await service
    .from('site_settings')
    .upsert({
      id: true,
      show_homepage_activity_publicly: parsed.showHomepageActivityPublicly,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) {
    console.error('[site-settings] update failed:', error);
    return NextResponse.json({ error: 'Could not update setting' }, { status: 500 });
  }

  return NextResponse.json({
    showHomepageActivityPublicly: parsed.showHomepageActivityPublicly,
  });
}
