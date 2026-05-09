'use client';

import { useState } from 'react';
import { ApplyShopModal } from '@/components/shop/ApplyShopModal';

export function ApplyShopModalTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-500 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Register your shop
      </button>
      {open && <ApplyShopModal onClose={() => setOpen(false)} />}
    </>
  );
}
