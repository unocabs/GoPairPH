'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { normalizeFacebookUsername } from '@/lib/facebook';

interface BuyerContactPromptProps {
  profileId?: string | null;
  initialFbUsername?: string | null;
}

export function BuyerContactPrompt({ profileId, initialFbUsername }: BuyerContactPromptProps) {
  const [fbUsername, setFbUsername] = useState(initialFbUsername ?? '');
  const [editing, setEditing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(Boolean(initialFbUsername));

  if (!profileId || saved || dismissed) return null;

  async function handleSave() {
    if (!profileId) return;
    setSaving(true);
    setError(null);

    const normalized = normalizeFacebookUsername(fbUsername);
    if (normalized.error) {
      setError(normalized.error);
      setSaving(false);
      return;
    }

    const { error: updateError } = await createClient()
      .from('profiles')
      .update({ fb_username: normalized.value })
      .eq('id', profileId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setFbUsername(normalized.value);
    setSaved(true);
    setSaving(false);
  }

  return (
    <div className="rounded-lg border border-white/[0.08] bg-slate-950/45 px-3 py-2.5">
      {editing ? (
        <div className="space-y-2">
          <Input
            label="Messenger username or Facebook profile link"
            placeholder="e.g. juan.delacruz"
            value={fbUsername}
            onChange={(event) => setFbUsername(event.target.value)}
            error={error ?? undefined}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" size="sm" onClick={handleSave} loading={saving}>
              Save
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setDismissed(true)}>
              Skip
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-200">Messenger contact optional</p>
            <p className="mt-0.5 text-xs leading-5 text-gray-500">
              Add it if you want the seller to reply faster after they accept.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs font-semibold text-teal-300 hover:text-teal-200"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-xs font-medium text-gray-500 hover:text-gray-300"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
