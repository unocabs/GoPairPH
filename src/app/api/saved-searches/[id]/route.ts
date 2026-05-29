import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { savedSearchSchema } from '@/lib/validations';

interface RouteContext {
  params: { id: string };
}

async function getProfileId() {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { supabase, profileId: null };
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  return { supabase, profileId: profile?.id ?? null };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { supabase, profileId } = await getProfileId();
  if (!profileId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = savedSearchSchema.partial().safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request body' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    update[key] = value ?? null;
  }

  const { data, error } = await supabase
    .from('saved_searches')
    .update(update)
    .eq('id', params.id)
    .eq('user_id', profileId)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ savedSearch: data });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { supabase, profileId } = await getProfileId();
  if (!profileId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('saved_searches')
    .delete()
    .eq('id', params.id)
    .eq('user_id', profileId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ deleted: true });
}
