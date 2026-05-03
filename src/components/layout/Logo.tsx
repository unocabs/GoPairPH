interface LogoProps {
  size?: 'sm' | 'md';
}

export function Logo({ size = 'md' }: LogoProps) {
  const px = size === 'sm' ? 24 : 28;

  return (
    <div className="flex items-center gap-2">
      <svg width={px} height={px} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#0d9488"/>
        <path d="M14 6 C5 6 4 11 4 16 C4 21 5 26 14 26 V18 H8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17 26 V6 H21 C29 6 29 22 21 22 H17" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="font-bold tracking-tight leading-none">
        <span className="text-gray-100">Go Pair</span>
        <span className="text-teal-400"> PH</span>
      </span>
    </div>
  );
}
