'use client'

import { useEffect, useState } from 'react'

import { BciDashboard } from '@/components/dashboard/bci-dashboard'
import { BciInputForm } from '@/components/bci-input-form'
import { LoadingState } from '@/components/loading-state'
import { designBci } from '@/lib/api/design'
import type { DesignRequest, DesignResponse } from '@/types/neuropilot'

type Phase = 'idle' | 'loading' | 'result' | 'error'

export default function HomePage() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [request, setRequest] = useState<DesignRequest | null>(null)
  const [response, setResponse] = useState<DesignResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (phase === 'result' || phase === 'error') {
      window.scrollTo({ top: 0 })
    }
  }, [phase])

  async function handleSubmit(nextRequest: DesignRequest) {
    setRequest(nextRequest)
    setResponse(null)
    setError(null)
    setPhase('loading')

    try {
      const nextResponse = await designBci(nextRequest)
      setResponse(nextResponse)
      setPhase('result')
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Something went wrong while designing your BCI.',
      )
      setPhase('error')
    }
  }

  return (
    <div
      className={`mx-auto flex min-h-dvh w-full flex-col px-4 sm:px-6 ${
        phase === 'result' ? 'max-w-7xl' : 'max-w-4xl'
      }`}
    >
      <header className="flex items-center justify-between gap-4 py-7">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[4px] bg-cyan-400" />
          <div>
            <p className="text-sm font-semibold tracking-tight text-zinc-100">NeuroPilot</p>
            <p className="text-xs text-zinc-500">AI copilot for designing BCI prototypes</p>
          </div>
        </div>
        <span className="rounded-full border border-zinc-800 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Design Mode
        </span>
      </header>

      {phase === 'idle' ? (
        <main className="flex-1 pb-16">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
            What BCI do you want to build?
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">
            Describe your idea in plain language. NeuroPilot matches it to a supported BCI
            paradigm, retrieves connected neuroscience and engineering knowledge, and returns a
            structured prototype plan — including the reasoning behind every recommendation.
          </p>
          <div className="mt-10">
            <BciInputForm initialRequest={request} onSubmit={handleSubmit} />
          </div>
        </main>
      ) : null}

      {phase === 'loading' ? (
        <main className="flex-1 pb-16 pt-6">
          {request ? (
            <p className="mb-6 line-clamp-2 border-l-2 border-zinc-800 pl-4 text-sm leading-relaxed text-zinc-500">
              {request.goal}
            </p>
          ) : null}
          <LoadingState />
        </main>
      ) : null}

      {phase === 'result' && response ? (
        <main className="flex-1 pb-16 pt-4">
          <BciDashboard response={response} />
          <div className="mt-10">
            <button
              type="button"
              onClick={() => setPhase('idle')}
              className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-cyan-500/40"
            >
              ← Design another BCI
            </button>
          </div>
        </main>
      ) : null}

      {phase === 'error' ? (
        <main className="flex-1 pb-16 pt-10">
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.04] p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-rose-400">Error</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">{error}</p>
            <button
              type="button"
              onClick={() => setPhase('idle')}
              className="mt-5 rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-cyan-500/40"
            >
              ← Back to the form
            </button>
          </div>
        </main>
      ) : null}

      <footer className="border-t border-zinc-900 py-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-700">
        NeuroPilot · Hackathon MVP
      </footer>
    </div>
  )
}
