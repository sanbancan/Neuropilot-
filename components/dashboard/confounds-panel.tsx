import { Panel } from '@/components/dashboard/panel'
import { mitigationFor } from '@/lib/dashboard/insights'
import type { PlanConfound } from '@/types/neuropilot'

const MAX_SHOWN = 5

/** Top confounds as compact, actionable warning cards. */
export function ConfoundsPanel({
  confounds,
  className = '',
}: {
  confounds: PlanConfound[]
  className?: string
}) {
  const shown = confounds.slice(0, MAX_SHOWN)
  const rest = confounds.length - shown.length

  return (
    <Panel eyebrow="Threats to validity" title="Risks & Confounds" className={className}>
      <div className="grid gap-3 sm:grid-cols-2">
        {shown.map((confound) => (
          <div
            key={confound.name}
            className="rounded-lg border border-amber-500/20 bg-amber-500/[0.05] p-3.5"
          >
            <div className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-px shrink-0 text-xs text-amber-400">
                ⚠
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-100">{confound.name}</p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-400">
                  {confound.detail}
                </p>
                <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-amber-400/80">
                    Check:{' '}
                  </span>
                  {mitigationFor(confound)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {rest > 0 ? (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
          +{rest} further confound{rest === 1 ? '' : 's'} tracked
        </p>
      ) : null}
    </Panel>
  )
}
