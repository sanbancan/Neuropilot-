import type { InsightCallout as InsightCalloutData } from '@/lib/dashboard/insights'

/** Row of short, high-signal takeaways beneath the KPI cards. */
export function InsightCallouts({ callouts }: { callouts: InsightCalloutData[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {callouts.map((callout) => (
        <div
          key={callout.label}
          className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-400/70">
            {callout.label}
          </p>
          <p
            className={`mt-1.5 text-sm font-semibold leading-snug text-zinc-100 ${
              callout.multiline ? 'line-clamp-3' : 'line-clamp-2'
            }`}
          >
            {callout.value}
          </p>
          {callout.sub ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">{callout.sub}</p>
          ) : null}
        </div>
      ))}
    </div>
  )
}
