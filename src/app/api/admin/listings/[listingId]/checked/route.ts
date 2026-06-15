import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

async function getAdminProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_admin')
    .eq('user_id', user.id)
    .maybeSingle();

  return profile?.is_admin ? { id: profile.id as string } : null;
}

export async function PATCH(_request: Request, { params }: { params: { listingId: string } }) {
  const admin = await getAdminProfile();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const service = createServiceClient();
  const { error } = await service
    .from('shoes')
    .update({
      admin_checked_at: new Date().toISOString(),
      admin_checked_by: admin.id,
    })
    .eq('id', params.listingId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: { listingId: string } }) {
  const admin = await getAdminProfile();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const service = createServiceClient();
  const { error } = await service
    .from('shoes')
    .update({
      admin_checked_at: null,
      admin_checked_by: null,
    })
    .eq('id', params.listingId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
