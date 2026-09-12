import { Fragment } from 'react'

import { Panel } from '@/components/dashboard/panel'
import type { ReasoningPathStep } from '@/types/neuropilot'

/**
 * Compact graph-reasoning visualization. Consecutive hops whose `from`
 * matches the previous `to` are drawn as one wrapping chain of node chips
 * connected by labeled edges; whenever a hop starts elsewhere, a new chain
 * begins. Evidence levels appear as colored dots with a small legend.
 */

interface Chain {
  steps: ReasoningPathStep[]
}

function buildChains(steps: ReasoningPathStep[]): Chain[] {
  const chains: Chain[] = []
  for (const step of steps) {
    const current = chains[chains.length - 1]
    const last = current?.steps[current.steps.length - 1]
    if (current && last && last.to === step.from) {
      current.steps.push(step)
    } else {
      chains.push({ steps: [step] })
    }
  }
  return chains
}

const EVIDENCE_DOT: Record<string, string> = {
  established: 'bg-cyan-400',
  'engineering-default': 'bg-zinc-500',
  exploratory: 'bg-amber-400',
}

export function ReasoningPanel({
  steps,
  className = '',
}: {
  steps: ReasoningPathStep[]
  className?: string
}) {
  const chains = buildChains(steps)

  return (
    <Panel eyebrow="Knowledge graph" title="Why NeuroPilot Recommended This" className={className}>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
        <LegendDot className="bg-cyan-400" label="established" />
        <LegendDot className="bg-amber-400" label="exploratory" />
        <LegendDot className="bg-zinc-500" label="engineering-default" />
      </div>
      <div className="space-y-2">
        {chains.map((chain, chainIndex) => (
          <div
            key={chainIndex}
            className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-lg border border-zinc-800/70 bg-zinc-950/40 px-3 py-2.5"
          >
            {chain.steps.map((step, stepIndex) => (
              <Fragment key={`${chainIndex}-${stepIndex}-${step.from}-${step.to}`}>
                {stepIndex === 0 ? (
                  <span className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-200">
                    {step.from}
                  </span>
                ) : null}
                <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-cyan-400/80">
                  {step.evidence ? (
                    <span
                      title={step.evidence}
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        EVIDENCE_DOT[step.evidence] ?? 'bg-zinc-500'
                      }`}
                    />
                  ) : null}
                  <span className="max-w-[120px] truncate">{step.relationship}</span>
                  <span aria-hidden="true" className="text-zinc-600">
                    →
                  </span>
                </span>
                <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-200">
                  {step.to}
                </span>
              </Fragment>
            ))}
          </div>
        ))}
      </div>
    </Panel>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${className}`} />
      {label}
    </span>
  )
}
