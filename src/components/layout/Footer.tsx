import Link from 'next/link';
import { Logo } from './Logo';

const FOOTER_GROUPS = [
  {
    heading: 'Marketplace',
    links: [
      { href: '/browse', label: 'Browse Listings' },
      { href: '/wishlist', label: 'Wishlist' },
      { href: '/listings/new', label: 'List a Shoe' },
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
  {
    heading: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-950 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-1">
            <Logo size="sm" />
            <p className="mt-3 text-xs text-gray-500 leading-relaxed">
              A community marketplace for runners in Pampanga, Philippines.
              Buy, sell, and donate pre-loved running shoes.
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
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} Go Pair PH. For Kapampangan, by Kapampangan.
          </p>
          <p className="text-xs text-gray-600">
            <Link href="/privacy" className="hover:text-teal-400 transition-colors">Privacy</Link>
            <span className="mx-2 text-gray-800">·</span>
            <Link href="/terms" className="hover:text-teal-400 transition-colors">Terms</Link>
            <span className="mx-2 text-gray-800">·</span>
            <Link href="/contact" className="hover:text-teal-400 transition-colors">Contact</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
