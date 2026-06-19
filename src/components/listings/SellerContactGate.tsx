'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { normalizeFacebookUsername } from '@/lib/facebook';

interface SellerContactGateProps {
  profileId: string;
  initialFbUsername?: string | null;
  hasShopContact?: boolean;
  children: React.ReactNode;
}

export function SellerContactGate({ profileId, initialFbUsername, hasShopContact = false, children }: SellerContactGateProps) {
  const [ready, setReady] = useState(Boolean(initialFbUsername) || hasShopContact);
  const [username, setUsername] = useState(initialFbUsername ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleSave() {
    setSaving(true);
    setError(null);

    const normalized = normalizeFacebookUsername(username);
    if (normalized.error) {
      setError(normalized.error);
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ fb_username: normalized.value })
      .eq('id', profileId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setUsername(normalized.value);
    setReady(true);
    setSaving(false);
  }

  if (ready) return <>{children}</>;

  return (
    <div className="space-y-6">
      <SurfaceCard glow className="border-amber-500/25 bg-amber-500/[0.04] p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(320px,0.48fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
              Optional contact boost
            </p>
            <h2 className="mt-2 text-xl font-bold text-gray-100">
              Add Messenger now, or skip and list first.
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              Messenger makes it easier for buyers to ask questions and close the deal, but you can
              publish your listing first and add it later from your profile. Add your location there too
              so buyers know if meetup, delivery, or shipping is realistic.
            </p>

            <div className="mt-5 max-w-md space-y-3">
              <Input
                label="Messenger username or Facebook profile link"
                placeholder="e.g. juan.delacruz or facebook.com/juan.delacruz"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                error={error ?? undefined}
                hint="We will save only the username part and use it for the Message on Messenger button."
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" onClick={handleSave} loading={saving} className="sm:flex-1">
                  Add Messenger
                </Button>
                <Button type="button" variant="neutral" onClick={() => setReady(true)} className="sm:flex-1">
                  Skip and List First
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Good listings can still receive requests on Go Pair PH. Messenger and location details just
                remove extra back-and-forth and help buyers trust the deal faster.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-slate-950/55 p-4">
            <h3 className="text-sm font-semibold text-gray-100">How to find your username</h3>
            <div className="mt-4 space-y-4 text-sm leading-6 text-gray-400">
              <div>
                <p className="font-semibold text-gray-200">On mobile</p>
                <p className="mt-1">
                  Open Facebook, go to your profile, tap the three-dot menu, then copy your profile link.
                  Paste it here. If it shows <span className="text-gray-300">profile.php?id=...</span>, create a username first in Facebook settings.
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-200">On desktop</p>
                <p className="mt-1">
                  Open your Facebook profile. Copy the part after <span className="text-teal-300">facebook.com/</span>.
                  For <span className="text-teal-300">facebook.com/juan.delacruz</span>, enter <span className="text-teal-300">juan.delacruz</span>.
                </p>
              </div>
              <div className="rounded-lg border border-teal-500/20 bg-teal-500/[0.06] p-3 text-xs text-teal-100">
                Messenger links usually work as <span className="font-semibold">m.me/your.username</span>.
                That is why a clean username is better than a numeric profile link.
              </div>
            </div>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
