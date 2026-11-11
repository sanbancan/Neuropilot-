import { Panel } from '@/components/dashboard/panel'
import type { PlanConfound } from '@/types/neuropilot'

/** All backend confounds, with no client-supplied technical advice. */
export function ConfoundsPanel({
  confounds,
  className = '',
}: {
  confounds: PlanConfound[]
  className?: string
}) {
  return (
    <Panel eyebrow="Threats to validity" title="Risks & Confounds" className={className}>
      <div className="grid gap-3 sm:grid-cols-2">
        {confounds.map((confound) => (
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
                <p className="mt-1 text-[11px] leading-snug text-zinc-400">
                  {confound.detail}
                </p>
                <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-amber-400/80">
                    Check:{' '}
                  </span>
                  {confound.mitigation || 'No mitigation specified in this plan.'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}
