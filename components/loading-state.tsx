'use client'

import { useEffect, useState } from 'react'

const STAGES = [
  'Understanding your BCI objective…',
  'Searching NeuroPilot knowledge graph…',
  'Checking neural signals and electrode locations…',
  'Evaluating experimental constraints…',
  'Building prototype specification…',
] as const

const STAGE_INTERVAL_MS = 1400

export function LoadingState() {
  const [currentStage, setCurrentStage] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStage((stage) => Math.min(stage + 1, STAGES.length - 1))
    }, STAGE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="NeuroPilot is designing your BCI prototype"
      className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-cyan-400"
        />
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">
          NeuroPilot · BCI Systems Architect
        </p>
      </div>
      <ul className="mt-6 space-y-3">
        {STAGES.map((stage, index) => {
          const state = index < currentStage ? 'done' : index === currentStage ? 'active' : 'pending'
          return (
            <li key={stage} className="flex items-center gap-3 text-sm">
              {state === 'done' ? (
                <span aria-hidden="true" className="font-mono text-xs text-cyan-400">
                  ✓
                </span>
              ) : state === 'active' ? (
                <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
              ) : (
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
              )}
              <span
                className={
                  state === 'active'
                    ? 'text-zinc-100'
                    : state === 'done'
                      ? 'text-zinc-500'
                      : 'text-zinc-600'
                }
              >
                {stage}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
