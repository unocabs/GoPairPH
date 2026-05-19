export const SOCIAL_LINKS = [
  {
    label: 'Facebook Page',
    href: 'https://www.facebook.com/gopairph',
  },
  {
    label: 'Facebook Group',
    href: 'https://www.facebook.com/groups/gopairph',
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/gopairph',
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@gopairph',
  },
] as const;

export const SOCIAL_URLS = SOCIAL_LINKS.map((link) => link.href);
