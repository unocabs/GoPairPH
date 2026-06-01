export function NewPill({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const padding = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/95 font-semibold text-slate-950 shadow-[0_6px_20px_rgba(0,0,0,0.35)] backdrop-blur-md ${padding}`}
      aria-label="Just posted in the last 24 hours"
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-300 opacity-80" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-300" />
      </span>
      Just Posted
    </span>
  );
}
