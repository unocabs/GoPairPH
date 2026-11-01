import type { PriceFeedbackSnapshot } from '@/lib/feedback';
import { buildPriceFeedbackReview } from '@/lib/pricing/feedbackReview';

export function PriceFeedbackReview({ snapshot, suggestedPrice }: { snapshot: PriceFeedbackSnapshot; suggestedPrice: number | null }) {
  const review = buildPriceFeedbackReview(snapshot, suggestedPrice);
  return <div className="space-y-4 rounded-xl border border-gray-700 bg-gray-950/50 p-3 sm:p-4">
    <p className="break-words font-semibold text-gray-100">{snapshot.input.brand} {snapshot.input.model}</p>
    <dl className="grid gap-3 sm:grid-cols-3">
      {review.metrics.map(metric => <div key={metric.label} className={`min-w-0 rounded-lg border p-3 ${metric.emphasis ? 'border-teal-500/30 bg-teal-500/[0.06]' : 'border-gray-800 bg-gray-900/60'}`}>
        <dt className="text-xs leading-5 text-gray-400">{metric.label}</dt>
        <dd className={`mt-1 break-words text-xl font-bold tabular-nums ${metric.emphasis ? 'text-teal-200' : 'text-gray-100'}`}>{metric.value}</dd>
        {metric.hint && <dd className="mt-1 text-xs leading-5 text-gray-500">{metric.hint}</dd>}
      </div>)}
    </dl>
    <p className="text-sm leading-6 text-gray-300">{review.differenceLabel}</p>
    <dl className="space-y-2 border-t border-gray-800 pt-3">
      {review.prices.map(row => <div key={row.label} className="flex flex-col gap-1 text-xs sm:flex-row sm:justify-between sm:gap-4"><dt className="text-gray-500">{row.label}</dt><dd className="break-words text-gray-200 sm:text-right">{row.value}</dd></div>)}
    </dl>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-800 pt-3 sm:grid-cols-4">
      {review.details.map(row => <div key={row.label} className="min-w-0 text-xs"><dt className="leading-5 text-gray-500">{row.label}</dt><dd className="mt-0.5 break-words leading-5 text-gray-200">{row.value}</dd></div>)}
    </dl>
    <details className="border-t border-gray-800 pt-2 text-xs text-gray-400">
      <summary className="min-h-9 cursor-pointer py-2">App reasoning and calculation version</summary>
      <p className="mt-2 break-words">Engine: {snapshot.engine_version} · {snapshot.evidence_type === 'formula' ? 'Formula only; no crawled market price attached' : snapshot.evidence_type}</p>
      <p className="mt-2">Confidence shown by the app: {snapshot.estimate.confidence}. This is the saved formula output, not verified market accuracy.</p>
      <ul className="mt-2 list-disc space-y-1 pl-4">{snapshot.estimate.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>
      <p className="mt-3 leading-5">Shoe details and SRP were supplied by the user. Receipt availability does not establish authenticity. This snapshot is preserved from submission time.</p>
    </details>
  </div>;
}
