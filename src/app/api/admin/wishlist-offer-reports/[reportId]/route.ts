import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface RouteContext {
  params: { reportId: string };
}

async function getAdminProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_admin')
    .eq('user_id', user.id)
    .single();

  return profile?.is_admin ? { id: profile.id } : null;
}

export async function PATCH(_request: Request, { params }: RouteContext) {
  const admin = await getAdminProfile();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createServiceClient();
  const { error } = await service
    .from('wishlist_offer_reports')
    .update({
      status: 'dismissed',
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', params.reportId)
    .eq('status', 'open');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
