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
    <div className="rounded-lg border border-teal-500/25 bg-teal-500/[0.06] px-3 py-3">
      <p className="text-xs font-semibold text-teal-200">Help the seller reply faster</p>
      <p className="mt-1 text-xs leading-5 text-gray-400">
        Add your Messenger username so the seller can coordinate quickly after reviewing your request. You can still continue without it.
      </p>

      {editing ? (
        <div className="mt-3 space-y-2">
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
              Not now
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button type="button" size="sm" onClick={() => setEditing(true)}>
            Add Messenger
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setDismissed(true)}>
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}
