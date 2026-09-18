'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { trackMarketplaceAction } from '@/lib/analytics';

export function GuideLink({ href, source, children, className }: {
  href: string;
  source: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => trackMarketplaceAction('guide_navigation', { source_page: source, destination: href })}
    >
      {children}
    </Link>
  );
}
