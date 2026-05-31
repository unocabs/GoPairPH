import Link from 'next/link';
import { Logo } from './Logo';
import { SOCIAL_LINKS } from '@/lib/socialLinks';

const FOOTER_GROUPS = [
  {
    heading: 'GP Marketplace',
    links: [
      { href: '/browse', label: 'All Listings' },
      { href: '/price-guide', label: 'Price Guide' },
      { href: '/shop', label: 'Shops' },
      { href: '/looking-for', label: 'Looking For' },
      { href: '/listings/new', label: 'List a Shoe' },
    ],
  },
  {
    heading: 'Help Center',
    links: [
      { href: '/help/how-to-buy', label: 'How to Buy' },
      { href: '/help/how-to-sell', label: 'How to Sell' },
      { href: '/help/looking-for', label: 'How Looking For Works' },
      { href: '/help/verification', label: 'Verification Process' },
    ],
  },
  {
    heading: 'About',
    links: [
      { href: '/about', label: 'About Us' },
      { href: '/contact', label: 'Contact' },
      { href: '/safety', label: 'Safety Guide' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-950 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-5">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-1">
            <Logo size="sm" />
            <p className="mt-3 text-xs text-gray-500 leading-relaxed">
              GP Marketplace is a Pampanga-focused running shoe marketplace for runners,
              Central Luzon and NCR sellers, brand-new pairs, pre-loved pairs, and donations.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_GROUPS.map(group => (
            <div key={group.heading}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-3">
                {group.heading}
              </h3>
              <ul className="space-y-2">
                {group.links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-500 hover:text-teal-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-3">
              Follow
            </h3>
            <ul className="space-y-2">
              {SOCIAL_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-500 hover:text-teal-400 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} Go Pair PH. Built around Pampanga runners. To God be the glory.
          </p>
          <p className="text-xs text-gray-600">
            <Link href="/privacy" className="hover:text-teal-400 transition-colors">Privacy</Link>
            <span className="mx-2 text-gray-800">·</span>
            <Link href="/terms" className="hover:text-teal-400 transition-colors">Terms</Link>
            <span className="mx-2 text-gray-800">·</span>
            <Link href="/contact" className="hover:text-teal-400 transition-colors">Contact Go Pair PH</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
