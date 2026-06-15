export function SafeDealTips() {
  const tips = [
    'Check the actual shoes, soles, size tag, and fit before paying.',
    'Meet in a safe public place when possible.',
    'Avoid full payment before you verify the seller and item.',
  ];

  return (
    <div className="rounded-xl border border-white/[0.08] bg-slate-950/45 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-teal-400/25 bg-teal-400/[0.08] text-teal-200">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 3v5c0 4.5-2.9 8.6-7 10-4.1-1.4-7-5.5-7-10V6l7-3z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-100">Safe deal reminders</p>
          <ul className="mt-2 space-y-1.5 text-xs leading-5 text-gray-400">
            {tips.map(tip => (
              <li key={tip} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-teal-300" aria-hidden />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
          <a href="/safety" className="mt-3 inline-flex text-xs font-semibold text-teal-300 hover:text-teal-200">
            Read the Safety Guide
          </a>
        </div>
      </div>
    </div>
  );
}
