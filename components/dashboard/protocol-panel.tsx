import { Panel } from '@/components/dashboard/panel'
import type { PlanStep } from '@/types/neuropilot'

/** Numbered protocol steps with short wording only. */
export function ProtocolPanel({
  steps,
  className = '',
}: {
  steps: PlanStep[]
  className?: string
}) {
  return (
    <Panel eyebrow="Experiment" title="Experimental Protocol" className={className}>
      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10 font-mono text-[10px] text-cyan-300">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-snug text-zinc-100">{step.title}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-500">
                {step.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  )
}
