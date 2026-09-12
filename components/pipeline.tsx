import type { PlanStep } from '@/types/neuropilot'

/** Vertical flow diagram for the signal-processing pipeline. */
export function Pipeline({ steps }: { steps: PlanStep[] }) {
  return (
    <ol className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-5">
          <div className="flex flex-col items-center">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10 font-mono text-xs text-cyan-300">
              {String(index + 1).padStart(2, '0')}
            </span>
            {index < steps.length - 1 ? (
              <span aria-hidden="true" className="w-px flex-1 bg-zinc-800" />
            ) : null}
          </div>
          <div className={index < steps.length - 1 ? 'pb-7' : ''}>
            <p className="pt-1.5 text-sm font-medium text-zinc-100">{step.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
