import type { ReasoningPathStep } from '@/types/neuropilot'

/**
 * Node-and-connector visualization for the graph reasoning path.
 *
 * Works with arbitrary `reasoningPath` arrays: consecutive steps whose
 * `from` matches the previous `to` are drawn as one continuous chain;
 * whenever a step starts elsewhere, a new chain begins (with extra
 * separation), so branching paths and separate chains both render cleanly.
 */

type RenderItem =
  | { kind: 'node'; name: string; startsChain: boolean }
  | { kind: 'edge'; step: ReasoningPathStep }

function buildRenderItems(steps: ReasoningPathStep[]): RenderItem[] {
  const items: RenderItem[] = []
  steps.forEach((step, index) => {
    const continuesChain = index > 0 && step.from === steps[index - 1].to
    if (!continuesChain) {
      items.push({ kind: 'node', name: step.from, startsChain: index > 0 })
    }
    items.push({ kind: 'edge', step })
    items.push({ kind: 'node', name: step.to, startsChain: false })
  })
  return items
}

const EVIDENCE_BADGE_CLASSES: Record<string, string> = {
  established: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  'engineering-default': 'border-zinc-600 bg-zinc-800/60 text-zinc-400',
  exploratory: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
}

export function ReasoningPath({ steps }: { steps: ReasoningPathStep[] }) {
  const items = buildRenderItems(steps)

  return (
    <div>
      {items.map((item, index) =>
        item.kind === 'node' ? (
          <div key={index} className={item.startsChain ? 'mt-7' : 'mt-1'}>
            <span className="inline-flex items-center rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100">
              {item.name}
            </span>
          </div>
        ) : (
          <div key={index} className="flex gap-4 py-1.5 pl-[18px]">
            <div aria-hidden="true" className="flex flex-col items-center">
              <span className="w-px flex-1 bg-zinc-700" />
              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-zinc-600" fill="none">
                <path
                  d="M2.5 4.5 L6 8 L9.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="min-w-0 pt-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-400/90">
                {item.step.relationship}
                {item.step.evidence ? (
                  <span
                    className={`ml-2 rounded border px-1.5 py-0.5 text-[9px] tracking-wider ${
                      EVIDENCE_BADGE_CLASSES[item.step.evidence] ??
                      'border-zinc-600 bg-zinc-800/60 text-zinc-400'
                    }`}
                  >
                    {item.step.evidence}
                  </span>
                ) : null}
              </p>
              {item.step.note ? (
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{item.step.note}</p>
              ) : null}
            </div>
          </div>
        ),
      )}
    </div>
  )
}
