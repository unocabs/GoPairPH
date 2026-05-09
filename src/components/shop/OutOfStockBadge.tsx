interface OutOfStockBadgeProps {
  size?: 'sm' | 'md';
}

export function OutOfStockBadge({ size = 'md' }: OutOfStockBadgeProps) {
  const cls =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px]'
      : 'px-2.5 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-red-950 border border-red-800 font-bold uppercase tracking-wider text-red-300 ${cls}`}
      title="Out of stock — restock from your listing"
    >
      <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      Out of stock
    </span>
  );
}
