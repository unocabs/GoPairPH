export const BRANDS = [
  'Adidas', 'Asics', 'Brooks', 'Hoka', 'Mizuno',
  'New Balance', 'Nike', 'On Running', 'Puma', 'Salomon',
  'Saucony', 'Under Armour', 'Other',
];

export const CONDITIONS: Record<string, string> = {
  new: 'Brand New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
};

export const LISTING_TYPE_LABELS: Record<string, string> = {
  for_sale: 'For Sale',
  donate: 'Donate',
};

export const CONDITION_COLORS: Record<string, string> = {
  new: 'border border-emerald-500/45 bg-emerald-500/12 text-emerald-200',
  like_new: 'border border-sky-400/45 bg-sky-400/12 text-sky-200',
  good: 'border border-slate-300/45 bg-slate-300/10 text-slate-100',
  fair: 'border border-amber-300/45 bg-amber-300/12 text-amber-100',
};

export const LISTING_TYPE_COLORS: Record<string, string> = {
  for_sale: 'bg-purple-950 text-purple-400 border border-purple-800',
  donate: 'bg-green-950 text-green-400 border border-green-800',
};

export const US_SIZE_TYPES = {
  mens: "US Men's",
  womens: "US Women's",
  unisex: 'Unisex',
  unknown: 'US',
} as const;

export type UsSizeType = keyof typeof US_SIZE_TYPES;

export const US_SIZE_TYPE_OPTIONS = [
  { value: 'mens', label: "US Men's" },
  { value: 'womens', label: "US Women's" },
  { value: 'unisex', label: 'Unisex / Not sure' },
] as const;

export const US_SIZE_PREFIX: Record<UsSizeType, string> = {
  mens: 'US M',
  womens: 'US W',
  unisex: 'US',
  unknown: 'US',
};

export type SizeConversion = { eu: number; us: number; cm: number };

export const SIZE_CONVERSIONS_BY_US_TYPE: Record<UsSizeType, SizeConversion[]> = {
  mens: [
    { eu: 35.5, us: 3.5, cm: 22.5 },
    { eu: 36, us: 4.0, cm: 23.0 },
    { eu: 36.5, us: 4.5, cm: 23.5 },
    { eu: 37.5, us: 5.0, cm: 23.5 },
    { eu: 38, us: 5.5, cm: 24.0 },
    { eu: 38.5, us: 6.0, cm: 24.0 },
    { eu: 39, us: 6.5, cm: 24.5 },
    { eu: 40, us: 7.0, cm: 25.0 },
    { eu: 40.5, us: 7.5, cm: 25.5 },
    { eu: 41, us: 8.0, cm: 26.0 },
    { eu: 42, us: 8.5, cm: 26.5 },
    { eu: 42.5, us: 9.0, cm: 27.0 },
    { eu: 43, us: 9.5, cm: 27.5 },
    { eu: 44, us: 10.0, cm: 28.0 },
    { eu: 44.5, us: 10.5, cm: 28.5 },
    { eu: 45, us: 11.0, cm: 29.0 },
    { eu: 45.5, us: 11.5, cm: 29.5 },
    { eu: 46, us: 12.0, cm: 30.0 },
    { eu: 47, us: 12.5, cm: 30.5 },
    { eu: 47.5, us: 13.0, cm: 31.0 },
  ],
  womens: [
    { eu: 35, us: 5.0, cm: 22.0 },
    { eu: 35.5, us: 5.5, cm: 22.5 },
    { eu: 36, us: 6.0, cm: 23.0 },
    { eu: 36.5, us: 6.5, cm: 23.5 },
    { eu: 37.5, us: 7.0, cm: 24.0 },
    { eu: 38, us: 7.5, cm: 24.5 },
    { eu: 38.5, us: 8.0, cm: 25.0 },
    { eu: 39, us: 8.5, cm: 25.5 },
    { eu: 40, us: 9.0, cm: 26.0 },
    { eu: 40.5, us: 9.5, cm: 26.5 },
    { eu: 41, us: 10.0, cm: 27.0 },
    { eu: 42, us: 10.5, cm: 27.5 },
    { eu: 43, us: 11.0, cm: 28.0 },
    { eu: 44, us: 11.5, cm: 28.5 },
    { eu: 44.5, us: 12.0, cm: 29.0 },
  ],
  unisex: [
    { eu: 35, us: 4.0, cm: 22.0 },
    { eu: 35.5, us: 4.5, cm: 22.5 },
    { eu: 36, us: 5.0, cm: 23.0 },
    { eu: 36.5, us: 5.5, cm: 23.5 },
    { eu: 37, us: 6.0, cm: 24.0 },
    { eu: 37.5, us: 6.5, cm: 24.0 },
    { eu: 38, us: 7.0, cm: 24.5 },
    { eu: 38.5, us: 7.5, cm: 25.0 },
    { eu: 39, us: 8.0, cm: 25.5 },
    { eu: 40, us: 8.5, cm: 26.0 },
    { eu: 40.5, us: 9.0, cm: 26.5 },
    { eu: 41, us: 9.5, cm: 26.5 },
    { eu: 42, us: 10.0, cm: 27.0 },
    { eu: 42.5, us: 10.5, cm: 27.5 },
    { eu: 43, us: 11.0, cm: 28.0 },
    { eu: 44, us: 11.5, cm: 28.5 },
    { eu: 44.5, us: 12.0, cm: 29.0 },
    { eu: 45, us: 12.5, cm: 29.5 },
    { eu: 45.5, us: 13.0, cm: 30.0 },
    { eu: 46, us: 13.5, cm: 30.5 },
    { eu: 47, us: 14.0, cm: 31.0 },
  ],
  unknown: [],
};

SIZE_CONVERSIONS_BY_US_TYPE.unknown = SIZE_CONVERSIONS_BY_US_TYPE.unisex;

export const SIZE_CONVERSIONS = SIZE_CONVERSIONS_BY_US_TYPE.unisex;
