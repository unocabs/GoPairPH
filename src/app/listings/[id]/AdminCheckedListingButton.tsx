'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AdminCheckedListingButtonProps {
  listingId: string;
  checkedAt?: string | null;
}

export function AdminCheckedListingButton({ listingId, checkedAt }: AdminCheckedListingButtonProps) {
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const isChecked = Boolean(checkedAt);

  async function handleToggle() {
    setSaving(true);
    const response = await fetch(`/api/admin/listings/${listingId}/checked`, {
      method: isChecked ? 'DELETE' : 'PATCH',
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      alert(body.error ?? 'Could not update checked status.');
      setSaving(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-100">Basic listing check</p>
          <p className="mt-1 text-[11px] leading-5 text-gray-500">
            Shows “Checked by Go Pair PH” for basic listing quality only. This is not an authenticity guarantee.
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={saving}
          className="rounded-lg border border-teal-700 bg-teal-950 px-3 py-2 text-xs font-semibold text-teal-200 transition-colors hover:border-teal-500 hover:bg-teal-900 disabled:opacity-60"
        >
          {saving ? 'Saving...' : isChecked ? 'Remove checked' : 'Mark checked'}
        </button>
      </div>
      {checkedAt && (
        <p className="text-[11px] text-gray-500">
          Checked {new Date(checkedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}.
        </p>
      )}
    </div>
  );
}
