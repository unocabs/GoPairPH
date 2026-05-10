export interface ShopTheme {
  background: string;
  accent: string;
  surface: string;
  surfaceStrong: string;
  border: string;
  text: string;
  mutedText: string;
  accentText: string;
  overlay: string;
}

export interface ShopThemePreset {
  name: string;
  description: string;
  background: string;
  accent: string;
}

export const SHOP_THEME_PRESETS: ShopThemePreset[] = [
  {
    name: 'Go Pair Classic',
    description: 'Clean, familiar, and marketplace-friendly.',
    background: '#030712',
    accent: '#14b8a6',
  },
  {
    name: 'Sprint Orange',
    description: 'Energetic and sporty for bold resellers.',
    background: '#090b12',
    accent: '#f97316',
  },
  {
    name: 'Race Blue',
    description: 'Sharp and technical with a premium feel.',
    background: '#07111f',
    accent: '#38bdf8',
  },
  {
    name: 'Track Light',
    description: 'Bright, clean, and easy for buyers to scan.',
    background: '#f8fafc',
    accent: '#0f766e',
  },
  {
    name: 'Premium Mono',
    description: 'Minimal black-and-white storefront energy.',
    background: '#0a0a0a',
    accent: '#f5f5f5',
  },
];

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function normalizeHex(hex: string | null | undefined, fallback: string): string {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return fallback;
  return hex;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = hex.replace('#', '');
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  return `#${[r, g, b].map(channel => clamp(channel).toString(16).padStart(2, '0')).join('')}`;
}

function mix(a: string, b: string, amount: number): string {
  const first = hexToRgb(a);
  const second = hexToRgb(b);
  return rgbToHex({
    r: first.r + (second.r - first.r) * amount,
    g: first.g + (second.g - first.g) * amount,
    b: first.b + (second.b - first.b) * amount,
  });
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map(value => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function readableTextOn(hex: string): string {
  return luminance(hex) > 0.45 ? '#0f172a' : '#f8fafc';
}

export function getShopTheme(backgroundColor?: string | null, accentColor?: string | null): ShopTheme {
  const background = normalizeHex(backgroundColor, '#030712');
  const accent = normalizeHex(accentColor, '#14b8a6');
  const isLight = luminance(background) > 0.45;
  const text = isLight ? '#111827' : '#f9fafb';
  const mutedText = isLight ? '#475569' : '#a6adbb';
  const surface = mix(background, isLight ? '#ffffff' : '#111827', isLight ? 0.62 : 0.72);
  const surfaceStrong = mix(background, isLight ? '#ffffff' : '#1f2937', isLight ? 0.78 : 0.82);
  const border = mix(background, accent, isLight ? 0.22 : 0.34);

  return {
    background,
    accent,
    surface,
    surfaceStrong,
    border,
    text,
    mutedText,
    accentText: readableTextOn(accent),
    overlay: isLight ? 'rgba(255,255,255,0.62)' : 'rgba(3,7,18,0.66)',
  };
}
