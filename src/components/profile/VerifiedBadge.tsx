interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  /** When true, force icon-only rendering. Default renders the full pill. */
  iconOnly?: boolean;
}

export function VerifiedBadge({ size = 'md', iconOnly = false }: VerifiedBadgeProps) {
  const dim = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  const text = size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-xs' : 'text-[10px]';
  const padding = size === 'sm' ? 'px-1.5 py-0.5' : size === 'lg' ? 'px-2.5 py-1' : 'px-2 py-0.5';
  const iconDim = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  if (iconOnly) {
    return (
      <span className="inline-flex items-center align-middle" title="Verified user">
        <svg className={`${iconDim} text-teal-400`} fill="currentColor" viewBox="0 0 20 20" aria-label="Verified">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 align-middle rounded-full bg-teal-500/10 border border-teal-500/40 ${padding} ${text} font-bold uppercase tracking-wider text-teal-400`}
      title="Verified user"
    >
      <svg className={dim} fill="currentColor" viewBox="0 0 20 20" aria-label="Verified">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      Verified
    </span>
  );
}
