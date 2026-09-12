import { Panel } from '@/components/dashboard/panel'

/**
 * How to validate the prototype: the metric to inspect first, then the
 * remaining success criteria as a compact checklist.
 */
export function ValidationPanel({
  validation,
  firstMetric,
  className = '',
}: {
  validation: string[]
  firstMetric: string
  className?: string
}) {
  return (
    <Panel eyebrow="Decision" title="Validation & Success" className={className}>
      <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/[0.06] px-3.5 py-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-400/80">
          Inspect first
        </p>
        <p className="mt-1 text-sm font-semibold leading-snug text-zinc-100">{firstMetric}</p>
      </div>
      <ul className="mt-3 space-y-2">
        {validation.map((item) => {
          const colon = item.indexOf(':')
          const hasLabel = colon > 0 && colon <= 32
          const label = hasLabel ? item.slice(0, colon) : item
          const detail = hasLabel ? item.slice(colon + 1).trim() : undefined
          return (
            <li key={item} className="flex gap-2">
              <span aria-hidden="true" className="mt-px shrink-0 text-xs text-cyan-400/80">
                ✓
              </span>
              <p className="min-w-0 text-xs leading-relaxed text-zinc-500">
                <span className="font-medium text-zinc-200">{label}</span>
                {detail ? ` — ${detail}` : ''}
              </p>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
