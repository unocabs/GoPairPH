interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function VerifiedBadge({ size = 'md', showLabel = false }: VerifiedBadgeProps) {
  const dim = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  const text = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 align-middle ${showLabel ? `rounded-full bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 ${text} font-semibold text-sky-400` : ''}`}
      title="Verified user"
    >
      <svg className={`${dim} text-sky-400`} fill="currentColor" viewBox="0 0 24 24" aria-label="Verified">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      {showLabel && <span>Verified</span>}
    </span>
  );
}
