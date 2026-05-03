'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { profileSchema, type ProfileFormData } from '@/lib/validations';
import { type Profile } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface EditProfileModalProps {
  profile: Profile;
  onClose: () => void;
  onUpdated: (updated: Profile) => void;
}

export function EditProfileModal({ profile, onClose, onUpdated }: EditProfileModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFbHelp, setShowFbHelp] = useState(false);
  const supabase = createClient();

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: profile.display_name,
      location: profile.location ?? '',
      fb_username: profile.fb_username ?? '',
    },
  });

  async function onSubmit(data: ProfileFormData) {
    setSubmitting(true);
    setError(null);
    try {
      const { data: updated, error: err } = await supabase
        .from('profiles')
        .update({
          display_name: data.display_name,
          location: data.location,
          fb_username: data.fb_username.trim(),
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
          <Input
            label="Location"
            placeholder="e.g. Angeles City, Pampanga"
            hint="Help buyers know where to meet"
            error={errors.location?.message}
            {...register('location')}
          />

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
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" loading={submitting} className="flex-1">Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
