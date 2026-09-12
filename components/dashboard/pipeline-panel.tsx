import { Fragment } from 'react'

import { Panel } from '@/components/dashboard/panel'
import type { PlanStep } from '@/types/neuropilot'

/** Visual flow of the signal-processing chain: acquisition → classification. */
export function PipelinePanel({
  steps,
  className = '',
}: {
  steps: PlanStep[]
  className?: string
}) {
  return (
    <Panel eyebrow="Signal processing" title="Processing Pipeline" className={className}>
      <ol className="flex flex-wrap items-stretch gap-2">
        {steps.map((step, index) => (
          <Fragment key={step.title}>
            {index > 0 ? (
              <span
                aria-hidden="true"
                className="flex items-center px-0.5 font-mono text-xs text-zinc-600"
              >
                →
              </span>
            ) : null}
            <li className="min-w-[136px] flex-1 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
              <p className="font-mono text-[9px] text-cyan-400/70">
                {String(index + 1).padStart(2, '0')}
              </p>
              <p className="mt-0.5 text-xs font-semibold leading-snug text-zinc-100">
                {step.title}
              </p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-500">
                {step.detail}
              </p>
            </li>
          </Fragment>
        ))}
      </ol>
    </Panel>
  )
}
