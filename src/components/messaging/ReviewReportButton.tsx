'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function ReviewReportButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const router = useRouter();
  return <><button type="button" disabled={busy} className="mt-4 min-h-11 rounded-lg bg-teal-500 px-4 text-sm font-semibold text-gray-950 disabled:opacity-50" onClick={async () => {
    setBusy(true); setError('');
    try { const r = await fetch(`/api/admin/chat-reports/${id}`, { method: 'POST' }); if (!r.ok) throw new Error('Could not mark reviewed.'); router.push('/admin/messages'); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); setBusy(false); }
  }}>Mark reviewed</button>{error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}</>;
}
