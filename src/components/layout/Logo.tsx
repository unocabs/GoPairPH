interface LogoProps {
  size?: 'sm' | 'md';
}

export function Logo({ size = 'md' }: LogoProps) {
  const px = size === 'sm' ? 24 : 28;

  return (
    <div className="flex items-center gap-2">
      <svg width={px} height={px} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#0d9488"/>
        {/* N */}
        <path d="M5 8v16l9-16v16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {/* P */}
        <path d="M17 24V8h5a4 4 0 0 1 0 8h-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="font-bold tracking-tight leading-none">
        <span className="text-gray-100">Next Pair</span>
        <span className="text-teal-400"> PH</span>
      </span>
    </div>
  );
}
