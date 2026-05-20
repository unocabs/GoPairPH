export function normalizeFacebookUsername(raw: string): { value: string; error?: string } {
  let value = raw.trim();
  if (!value) return { value: '', error: 'Add your Messenger username or choose continue without it.' };

  value = value.replace(/^@+/, '');

  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'facebook.com' || host === 'm.facebook.com' || host === 'fb.com' || host === 'm.me' || host === 'messenger.com') {
      const firstPath = url.pathname.split('/').filter(Boolean)[0] ?? '';
      if (!firstPath || firstPath === 'profile.php') {
        return {
          value: '',
          error: 'Please use a Facebook username link like facebook.com/juan.delacruz, not a numeric profile link.',
        };
      }
      value = firstPath;
    }
  } catch {
    // Plain usernames are fine.
  }

  value = value.replace(/^@+/, '').replace(/[/?#].*$/, '');
  if (!/^[a-zA-Z0-9.]+$/.test(value)) {
    return { value, error: 'Use only letters, numbers, and dots. Example: juan.delacruz' };
  }

  return { value };
}
