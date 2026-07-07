import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminNotificationEmails, renderAdminActionEmail } from '@/lib/email/adminNotifications';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const requestSchema = z.object({
  proof: z.string().trim().min(3, 'Add at least one verification proof.').max(2000, 'Verification proof is too long.'),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid verification request.' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('id, display_name, is_verified')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError || !profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  if (profile.is_verified) return NextResponse.json({ error: 'Your profile is already verified.' }, { status: 409 });

  const { data: inserted, error: insertError } = await service
    .from('verification_requests')
    .insert({ user_id: profile.id, proof: parsed.data.proof })
    .select('id')
    .single();

  if (insertError || !inserted) {
    const duplicate = insertError?.code === '23505';
    return NextResponse.json({
      error: duplicate ? 'You already have a verification request pending review.' : insertError?.message ?? 'Could not submit verification request.',
    }, { status: duplicate ? 409 : 400 });
  }

  try {
    const admins = await getAdminNotificationEmails(service);
    if (admins.length > 0) {
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com').replace(/\/$/, '');
      await sendTransactionalEmail({
        category: 'admin_notification',
        to: admins,
        subject: `Verification request: ${profile.display_name || 'Go Pair PH user'}`,
        html: renderAdminActionEmail({
          title: 'New verification request',
          intro: 'A runner submitted identity or social proof for admin review.',
          rows: [
            { label: 'Profile', value: profile.display_name || 'Go Pair PH user' },
            { label: 'Account email', value: user.email ?? null },
          ],
          note: parsed.data.proof,
          adminUrl: `${siteUrl}/admin?tab=pending`,
          buttonLabel: 'Review verification',
        }),
        tags: { notification: 'verification_request' },
      });
    }
  } catch (emailError) {
    console.error('[verification-requests] admin email failed', emailError);
  }

  return NextResponse.json({ id: inserted.id }, { status: 201 });
}
