import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { PageShell } from '@/components/layout/PageShell';
import { ReviewReportButton } from '@/components/messaging/ReviewReportButton';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Chat reports', robots: { index: false, follow: false } };

export default async function ChatReports({ searchParams }: { searchParams: { report?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('user_id', user.id).single();
  if (!profile?.is_admin) redirect('/');
  const { data: reports, error } = await supabase.from('chat_reports').select('id,reason,status,created_at').eq('status', 'open').order('created_at', { ascending: false }).limit(50);
  const selected = z.string().uuid().safeParse(searchParams.report);
  const detail = selected.success ? await supabase.rpc('admin_chat_report', { p_report: selected.data }) : null;
  const history = (detail?.data?.messages ?? []) as Array<{ id: string; sender_id: string; body: string; kind: string; created_at: string }>;
  return <PageShell contentClassName="max-w-5xl"><Link href="/admin" className="inline-flex min-h-11 items-center text-sm text-teal-300">← Admin</Link><h1 className="mb-4 text-2xl font-bold">Chat reports</h1>
    {error && <p role="alert" className="text-sm text-red-300">Could not load reports. Confirm the messaging migrations are applied.</p>}
    <div className="grid gap-6 md:grid-cols-2"><div className="space-y-3">{reports?.length ? reports.map(r => <Link key={r.id} href={`/admin/messages?report=${r.id}`} className="block rounded-xl border border-gray-700 bg-gray-900 p-4 text-sm"><p className="break-words">{r.reason}</p><p className="mt-2 text-xs text-gray-400">{new Date(r.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</p></Link>) : !error && <p className="text-sm text-gray-400">No open reports.</p>}</div>
      {selected.success && <section><h2 className="mb-3 font-semibold">Reported conversation</h2><p className="mb-3 text-xs text-gray-400">Access is recorded. Showing the latest 50 messages.</p>{detail?.error ? <p role="alert" className="text-sm text-red-300">Could not load this report.</p> : <><div className="max-h-[65dvh] space-y-3 overflow-y-auto">{history.map(m => <div key={m.id} className="rounded-lg bg-gray-900 p-3"><p className="mb-1 text-xs text-gray-400">{m.sender_id} · {new Date(m.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</p><p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{m.body}</p></div>)}</div><ReviewReportButton id={selected.data} /></>}</section>}
    </div>
  </PageShell>;
}
