interface FlaggedPillProps {
  size?: 'sm' | 'md';
}

export function FlaggedPill({ size = 'md' }: FlaggedPillProps) {
  return (
    <span
      className={
        size === 'sm'
          ? 'inline-flex items-center rounded-full border border-amber-300/45 bg-amber-500/18 px-2 py-0.5 text-[10px] font-semibold text-amber-100 shadow-sm shadow-black/20 backdrop-blur-sm'
          : 'inline-flex items-center rounded-full border border-amber-300/45 bg-amber-500/18 px-2.5 py-1 text-xs font-semibold text-amber-100 shadow-sm shadow-black/20'
      }
    >
      Flagged
    </span>
  );
}
