const RESERVED_FACEBOOK_PATHS = new Set([
  'share',
  'sharer',
  'messages',
  'messenger',
  'marketplace',
  'groups',
  'pages',
  'people',
  'profile.php',
  'watch',
  'reel',
  'story.php',
  'stories',
  'events',
  'login',
  'help',
]);

function cleanUsernameCandidate(value: string): string {
  return value.trim().replace(/^@+/, '').replace(/[/?#].*$/, '');
}

function validateUsernameCandidate(value: string): { value: string; error?: string } {
  const cleaned = cleanUsernameCandidate(value);
  const lower = cleaned.toLowerCase();

  if (!cleaned) {
    return { value: '', error: 'Add your Messenger username or Facebook profile link.' };
  }

  if (RESERVED_FACEBOOK_PATHS.has(lower)) {
    return {
      value: cleaned,
      error: 'That link does not point to a specific Facebook profile or page. Use your profile username, like juan.delacruz.',
    };
  }

  if (!/^[a-zA-Z0-9.]+$/.test(cleaned)) {
    return { value: cleaned, error: 'Use only letters, numbers, and dots. Example: juan.delacruz' };
  }

  if (cleaned.length > 50) {
    return { value: cleaned, error: 'Facebook username is too long.' };
  }

  return { value: cleaned };
}

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

  return validateUsernameCandidate(value);
}

export function buildMessengerUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const normalized = normalizeFacebookUsername(raw);
  if (normalized.error || !normalized.value) return null;
  return `https://m.me/${normalized.value}`;
}

export function getFacebookContactUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'm.me' || host === 'messenger.com') {
      return buildMessengerUrl(url.pathname.split('/').filter(Boolean)[0] ?? '');
    }

    if (host === 'facebook.com' || host === 'm.facebook.com' || host === 'fb.com') {
      const firstPath = url.pathname.split('/').filter(Boolean)[0] ?? '';
      const validated = validateUsernameCandidate(firstPath);
      if (validated.error || !validated.value) return null;
      return `https://www.facebook.com/${validated.value}`;
    }
  } catch {
    // Fall through to the plain-username handling below.
  }

  const validated = validateUsernameCandidate(value);
  if (validated.error || !validated.value) return null;
  return `https://www.facebook.com/${validated.value}`;
}
