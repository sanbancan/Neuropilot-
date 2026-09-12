import { Panel } from '@/components/dashboard/panel'
import type { NextAction } from '@/lib/dashboard/insights'

/** The top three things to do next — the most practical takeaway. */
export function NextActionsPanel({
  actions,
  className = '',
}: {
  actions: NextAction[]
  className?: string
}) {
  return (
    <Panel eyebrow="Act on it" title="Next Best Actions" className={className}>
      <ol className="space-y-3">
        {actions.map((action, index) => (
          <li
            key={action.eyebrow}
            className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3.5"
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-400/70">
                {action.eyebrow}
              </p>
              <span className="font-mono text-[10px] text-zinc-600">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold leading-snug text-zinc-100">{action.action}</p>
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-500">
              {action.rationale}
            </p>
          </li>
        ))}
      </ol>
    </Panel>
  )
}
