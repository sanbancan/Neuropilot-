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
    <Panel eyebrow="Decision" title="Proposed Validation" className={className}>
      <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/[0.06] px-3.5 py-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-400/80">
          First listed validation item
        </p>
        <p className="mt-1 text-sm font-semibold leading-snug text-zinc-100">{firstMetric}</p>
      </div>
      <ul className="mt-3 space-y-2">
        {validation.map((item, index) => (
          <li key={index} className="flex gap-2">
            <span aria-hidden="true" className="mt-px shrink-0 text-xs text-cyan-400/80">•</span>
            <p className="min-w-0 text-xs leading-relaxed text-zinc-300">{item}</p>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
