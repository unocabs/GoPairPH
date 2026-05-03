export const BRANDS = [
  'Adidas', 'Asics', 'Brooks', 'Hoka', 'Mizuno',
  'New Balance', 'Nike', 'On Running', 'Puma', 'Salomon',
  'Saucony', 'Under Armour', 'Other',
];

export const CONDITIONS: Record<string, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
};

export const LISTING_TYPE_LABELS: Record<string, string> = {
  for_sale: 'For Sale',
  donate: 'Donate',
};

export const CONDITION_COLORS: Record<string, string> = {
  new: 'bg-green-950 text-green-400 border border-green-800',
  like_new: 'bg-blue-950 text-blue-400 border border-blue-800',
  good: 'bg-yellow-950 text-yellow-400 border border-yellow-800',
  fair: 'bg-orange-950 text-orange-400 border border-orange-800',
};

export const LISTING_TYPE_COLORS: Record<string, string> = {
  for_sale: 'bg-purple-950 text-purple-400 border border-purple-800',
  donate: 'bg-green-950 text-green-400 border border-green-800',
};

export const SIZE_CONVERSIONS: Array<{ eu: number; us: number; cm: number }> = [
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
];
