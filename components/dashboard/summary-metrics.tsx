import type { MetricCard, MetricTone } from '@/lib/dashboard/insights'

const VALUE_TONE: Record<MetricTone, string> = {
  default: 'text-zinc-100',
  accent: 'text-cyan-300',
  caution: 'text-amber-300',
}

/** Top row of compact KPI cards — the at-a-glance summary of the prototype. */
export function SummaryMetrics({ metrics }: { metrics: MetricCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            {metric.label}
          </p>
          <p
            className={`mt-1.5 truncate text-sm font-semibold ${
              VALUE_TONE[metric.tone ?? 'default']
            }`}
          >
            {metric.value}
          </p>
          {metric.sub ? <p className="truncate text-[11px] text-zinc-500">{metric.sub}</p> : null}
        </div>
      ))}
    </div>
  )
}
