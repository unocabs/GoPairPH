import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const ACTIVE_WINDOW_MINUTES = 5;

const heartbeatSchema = z.object({
  visitorId: z.string().trim().min(12).max(128),
});

const visibilitySchema = z.object({
  showActiveVisitorsPublicly: z.boolean(),
});

function hashVisitorId(visitorId: string): string {
  const secret = process.env.VISITOR_PRESENCE_SECRET
    ?? process.env.VIEW_TRACKING_SECRET
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? 'gopairph-visitor-presence';

  return createHash('sha256')
    .update(`${secret}:${visitorId}`)
    .digest('hex');
}

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

async function readVisitorPresence(profile: { is_admin: boolean } | null) {
  const service = createServiceClient();
  const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MINUTES * 60 * 1000).toISOString();

  await service
    .from('visitor_presence')
    .delete()
    .lt('last_seen_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const [{ data: settings }, { count }] = await Promise.all([
    service
      .from('site_settings')
      .select('show_active_visitors_publicly')
      .eq('id', true)
      .maybeSingle(),
    service
      .from('visitor_presence')
      .select('visitor_hash', { count: 'exact', head: true })
      .eq('is_admin', false)
      .gte('last_seen_at', activeSince),
  ]);

  const showPublicly = Boolean(settings?.show_active_visitors_publicly);
  const isAdmin = Boolean(profile?.is_admin);
  const visible = isAdmin || showPublicly;

  return {
    activeVisitors: visible ? count ?? 0 : null,
    showActiveVisitorsPublicly: showPublicly,
    visible,
    isAdmin,
  };
}

export async function GET() {
  const profile = await getCurrentProfile();
  const response = await readVisitorPresence(profile);
  return NextResponse.json(response);
}

export async function POST(request: Request) {
  let parsed: z.infer<typeof heartbeatSchema>;
  try {
    parsed = heartbeatSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const profile = await getCurrentProfile();
  const service = createServiceClient();
  const visitorHash = hashVisitorId(parsed.visitorId);

  await service
    .from('visitor_presence')
    .upsert({
      visitor_hash: visitorHash,
      profile_id: profile?.id ?? null,
      is_admin: Boolean(profile?.is_admin),
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'visitor_hash' });

  const response = await readVisitorPresence(profile);
  return NextResponse.json({ ok: true, ...response });
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
      show_active_visitors_publicly: parsed.showActiveVisitorsPublicly,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) {
    console.error('[visitor-presence] setting update failed:', error);
    return NextResponse.json({ error: 'Could not update setting' }, { status: 500 });
  }

  const response = await readVisitorPresence(profile);
  return NextResponse.json(response);
}
