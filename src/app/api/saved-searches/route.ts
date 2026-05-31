import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { savedSearchSchema } from '@/lib/validations';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = savedSearchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request body' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('saved_searches')
    .insert({
      user_id: profile.id,
      keyword: parsed.data.keyword,
      brand: parsed.data.brand ?? null,
      size_eu: parsed.data.size_eu ?? null,
      size_us: parsed.data.size_us ?? null,
      size_cm: parsed.data.size_cm ?? null,
      us_size_type: parsed.data.us_size_type ?? 'mens',
      condition: parsed.data.condition ?? null,
      max_price_php: parsed.data.max_price_php ?? null,
      email_enabled: parsed.data.email_enabled ?? true,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ savedSearch: data }, { status: 201 });
}
