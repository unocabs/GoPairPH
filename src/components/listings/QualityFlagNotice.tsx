interface QualityFlagNoticeProps {
  reasons?: string[] | null;
  note?: string | null;
}

export function QualityFlagNotice({ reasons, note }: QualityFlagNoticeProps) {
  const visibleReasons = reasons?.filter(Boolean) ?? [];
  const trimmedNote = note?.trim();

  return (
    <div className="rounded-xl border border-amber-300/25 bg-amber-500/[0.07] p-4 text-sm shadow-[0_14px_45px_rgba(0,0,0,0.16)]">
      <p className="font-semibold text-amber-100">This listing needs a quick repost</p>
      <p className="mt-1 leading-6 text-amber-100/85">
        This listing was flagged because it may be harder for buyers to trust or understand. Please repost your running shoes with clearer photos and complete details so buyers will be more likely to send offers.
      </p>

      {visibleReasons.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200/80">What to improve</p>
          <ul className="mt-2 space-y-1.5 text-xs leading-5 text-amber-100/80">
            {visibleReasons.map((reason) => (
              <li key={reason} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-200/80" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {trimmedNote && (
        <div className="mt-3 rounded-lg border border-amber-200/15 bg-black/15 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200/80">Admin note</p>
          <p className="mt-1 text-xs leading-5 text-amber-100/80">{trimmedNote}</p>
        </div>
      )}
    </div>
  );
}
