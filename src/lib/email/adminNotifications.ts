import type { createServiceClient } from '@/lib/supabase/server';
import { escapeHtml, paragraph, renderButton, renderCallout, renderEmailShell, renderInfoRows } from './template';

type ServiceClient = ReturnType<typeof createServiceClient>;

export async function getAdminNotificationEmails(service: ServiceClient): Promise<string[]> {
  const emails = new Set<string>();

  for (const email of process.env.ADMIN_NOTIFICATION_EMAILS?.split(',') ?? []) {
    const normalized = email.trim().toLowerCase();
    if (normalized) emails.add(normalized);
  }

  const { data: admins, error } = await service
    .from('profiles')
    .select('user_id')
    .eq('is_admin', true);

  if (error) {
    console.error('[admin-notifications] could not load admin profiles', error);
  }

  for (const admin of admins ?? []) {
    const { data, error: userError } = await service.auth.admin.getUserById(admin.user_id);
    if (userError) {
      console.error('[admin-notifications] could not load admin email', userError);
      continue;
    }
    const normalized = data.user?.email?.trim().toLowerCase();
    if (normalized) emails.add(normalized);
  }

  return Array.from(emails);
}

export function renderAdminActionEmail({
  title,
  intro,
  rows,
  note,
  adminUrl,
  buttonLabel = 'Review in admin',
}: {
  title: string;
  intro: string;
  rows: Array<{ label: string; value: string | number | null | undefined }>;
  note?: string | null;
  adminUrl: string;
  buttonLabel?: string;
}): string {
  return renderEmailShell({
    eyebrow: 'Admin notification',
    title,
    preheader: intro,
    footerReason: 'You received this transactional email because your address is configured for Go Pair PH admin notifications.',
    children: [
      paragraph(escapeHtml(intro)),
      renderInfoRows(rows),
      note?.trim()
        ? renderCallout('Submitted details', escapeHtml(note).replace(/\n/g, '<br />'))
        : '',
      `<div style="margin-top:22px;">${renderButton(adminUrl, buttonLabel)}</div>`,
    ].join(''),
  });
}
