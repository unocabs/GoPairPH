'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type InputHTMLAttributes } from 'react';
import { createClient } from '@/lib/supabase/client';
import { profileSchema, type ProfileFormData, type ProfileFormInput } from '@/lib/validations';
import { type Profile } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { normalizeFacebookUsername } from '@/lib/facebook';
import { US_SIZE_TYPE_OPTIONS } from '@/lib/constants';
import { cn, findSizeConversion, formatSize } from '@/lib/utils';

interface EditProfileModalProps {
  profile: Profile;
  onClose: () => void;
  onUpdated: (updated: Profile) => void;
}

export function EditProfileModal({ profile, onClose, onUpdated }: EditProfileModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFbHelp, setShowFbHelp] = useState(false);
  const [personalizedBrowseEnabled, setPersonalizedBrowseEnabled] = useState(profile.personalized_browse_enabled ?? true);
  const [profileMatchEmailEnabled, setProfileMatchEmailEnabled] = useState(profile.profile_match_email_enabled ?? true);
  const supabase = createClient();

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<ProfileFormInput, unknown, ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: profile.display_name,
      fb_username: profile.fb_username ?? '',
      location_city: profile.location_city ?? '',
      location_province: profile.location_province ?? '',
      location_region: profile.location_region ?? '',
      preferred_size_eu: profile.preferred_size_eu,
      preferred_size_us: profile.preferred_size_us,
          preferred_size_cm: profile.preferred_size_cm,
          preferred_us_size_type: profile.preferred_us_size_type ?? 'mens',
        },
      });

  const sizeEu = toNumber(watch('preferred_size_eu'));
  const sizeUs = toNumber(watch('preferred_size_us'));
  const sizeCm = toNumber(watch('preferred_size_cm'));
  const usSizeType = watch('preferred_us_size_type') ?? 'mens';
  const preferredSizeLabel = formatSize(sizeEu, sizeUs, sizeCm, usSizeType);

  function toNumber(value: unknown): number | null {
    if (value === '' || value == null) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function blankToNull(value: string | null | undefined): string | null {
    const trimmed = value?.trim() ?? '';
    return trimmed ? trimmed : null;
  }

  function setSizeFromMatch(field: 'eu' | 'us' | 'cm', value: string) {
    const number = Number.parseFloat(value);
    if (!Number.isFinite(number)) return;
    const match = findSizeConversion(field, number, usSizeType);
    if (!match) return;
    if (field !== 'eu') setValue('preferred_size_eu', match.eu, { shouldDirty: true, shouldValidate: true });
    if (field !== 'us') setValue('preferred_size_us', match.us, { shouldDirty: true, shouldValidate: true });
    if (field !== 'cm') setValue('preferred_size_cm', match.cm, { shouldDirty: true, shouldValidate: true });
  }

  function handleUsSizeTypeChange(value: string) {
    setValue('preferred_us_size_type', value as ProfileFormData['preferred_us_size_type'], { shouldDirty: true, shouldValidate: true });
    const match = sizeUs
      ? findSizeConversion('us', sizeUs, value)
      : sizeEu
        ? findSizeConversion('eu', sizeEu, value)
        : null;
    if (!match) return;
    setValue('preferred_size_eu', match.eu, { shouldDirty: true, shouldValidate: true });
    setValue('preferred_size_us', match.us, { shouldDirty: true, shouldValidate: true });
    setValue('preferred_size_cm', match.cm, { shouldDirty: true, shouldValidate: true });
  }

  async function onSubmit(data: ProfileFormData) {
    setSubmitting(true);
    setError(null);
    try {
      const normalized = normalizeFacebookUsername(data.fb_username);
      if (normalized.error) {
        setError(normalized.error);
        setSubmitting(false);
        return;
      }

      const { data: updated, error: err } = await supabase
        .from('profiles')
        .update({
          display_name: data.display_name,
          location: null,
          location_city: blankToNull(data.location_city),
          location_province: blankToNull(data.location_province),
          location_region: blankToNull(data.location_region),
          fb_username: normalized.value,
          preferred_size_eu: data.preferred_size_eu ?? null,
          preferred_size_us: data.preferred_size_us ?? null,
          preferred_size_cm: data.preferred_size_cm ?? null,
          preferred_us_size_type: data.preferred_us_size_type ?? 'mens',
          personalized_browse_enabled: personalizedBrowseEnabled,
          profile_match_email_enabled: profileMatchEmailEnabled,
        })
        .eq('id', profile.id)
        .select()
        .single();
      if (err) throw err;
      onUpdated(updated as Profile);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl shadow-black/50 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Edit Profile</h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-950 border border-red-800 p-3 text-sm text-red-400">{error}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Display Name" required error={errors.display_name?.message} {...register('display_name')} />

          <div className="rounded-xl border border-teal-500/20 bg-teal-500/[0.04] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-300">
                  Marketplace preferences
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-400">
                  Helps GP Marketplace show your size and nearby sellers first.
                </p>
              </div>
              {preferredSizeLabel && (
                <span className="shrink-0 rounded-full border border-teal-400/25 bg-teal-500/10 px-2 py-1 text-[11px] font-semibold text-teal-200">
                  {preferredSizeLabel}
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <Input
                label="EU"
                placeholder="42"
                error={errors.preferred_size_eu?.message}
                {...register('preferred_size_eu')}
                onChange={(event) => {
                  register('preferred_size_eu').onChange(event);
                  setSizeFromMatch('eu', event.target.value);
                }}
              />
              <Input
                label="US"
                placeholder="10"
                error={errors.preferred_size_us?.message}
                {...register('preferred_size_us')}
                onChange={(event) => {
                  register('preferred_size_us').onChange(event);
                  setSizeFromMatch('us', event.target.value);
                }}
              />
              <Input
                label="CM"
                placeholder="27"
                error={errors.preferred_size_cm?.message}
                {...register('preferred_size_cm')}
                onChange={(event) => {
                  register('preferred_size_cm').onChange(event);
                  setSizeFromMatch('cm', event.target.value);
                }}
              />
            </div>

            <div className="mt-2">
              <label className="mb-1 block text-xs font-medium text-gray-300">US size type</label>
              <input type="hidden" {...register('preferred_us_size_type')} />
              <select
                value={usSizeType}
                onChange={(event) => handleUsSizeTypeChange(event.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {US_SIZE_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value} className="bg-gray-800">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Input label="City" placeholder="Angeles City" error={errors.location_city?.message} {...register('location_city')} />
              <Input label="Province" placeholder="Pampanga" error={errors.location_province?.message} {...register('location_province')} />
              <Input label="Region" placeholder="Central Luzon" error={errors.location_region?.message} {...register('location_region')} />
            </div>

            <div className="mt-3 space-y-2">
              <PreferenceToggle
                label="Show my size and nearby sellers first"
                checked={personalizedBrowseEnabled}
                onChange={(event) => setPersonalizedBrowseEnabled(event.target.checked)}
              />
              <PreferenceToggle
                label="Email me when new listings match my size"
                checked={profileMatchEmailEnabled}
                onChange={(event) => setProfileMatchEmailEnabled(event.target.checked)}
              />
            </div>
          </div>

          <div>
            <Input
              label="Facebook Messenger username"
              required
              placeholder="e.g. john.doe.1"
              hint="Required — buyers will use this to contact you via Messenger"
              error={errors.fb_username?.message}
              {...register('fb_username')}
            />
            <button
              type="button"
              onClick={() => setShowFbHelp(s => !s)}
              className="mt-1 text-xs text-teal-400 hover:text-teal-300"
            >
              {showFbHelp ? 'Hide' : 'How do I find my username?'}
            </button>
            {showFbHelp && (
              <div className="mt-2 rounded-lg bg-gray-800 border border-gray-700 p-3 text-xs text-gray-400 space-y-1.5">
                <p><span className="font-semibold text-gray-300">Desktop:</span> Open your Facebook profile. Your username is the part of the URL after <code className="text-teal-400">facebook.com/</code> (e.g. for <code className="text-teal-400">facebook.com/john.doe.1</code>, type <code className="text-teal-400">john.doe.1</code>).</p>
                <p><span className="font-semibold text-gray-300">Mobile:</span> Open the Messenger app → tap your profile picture (top-left) → your username is shown right below your name.</p>
                <p className="text-gray-500 pt-1 border-t border-gray-700">No custom username yet? Set one in Facebook Settings → Account → Username.</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="neutral" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" loading={submitting} className="flex-1">Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PreferenceToggle({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn('flex items-center gap-2 rounded-lg border border-white/[0.08] bg-slate-950/40 px-3 py-2 text-xs font-medium text-gray-300', className)}>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-teal-500 focus:ring-teal-500"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}
