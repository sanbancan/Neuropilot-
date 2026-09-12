import type { ReactNode } from 'react'

import { ConfoundsPanel } from '@/components/dashboard/confounds-panel'
import { DatasetsPanel } from '@/components/dashboard/datasets-panel'
import { ElectrodeSignalPanel } from '@/components/dashboard/electrode-signal-panel'
import { InsightCallouts } from '@/components/dashboard/insight-callouts'
import { NextActionsPanel } from '@/components/dashboard/next-actions-panel'
import { OverviewPanel } from '@/components/dashboard/overview-panel'
import { PipelinePanel } from '@/components/dashboard/pipeline-panel'
import { ProtocolPanel } from '@/components/dashboard/protocol-panel'
import { ReasoningPanel } from '@/components/dashboard/reasoning-panel'
import { SummaryMetrics } from '@/components/dashboard/summary-metrics'
import { ValidationPanel } from '@/components/dashboard/validation-panel'
import { buildDashboard } from '@/lib/dashboard/insights'
import type { DesignResponse } from '@/types/neuropilot'

/**
 * Compact, panel-based BCI prototype dashboard for the results page.
 *
 * Everything is derived client-side from the existing `DesignPlan` —
 * no backend or schema changes. Layout: KPI cards → insight callouts →
 * a responsive 1/2/3-column panel grid.
 */
export function BciDashboard({ response }: { response: DesignResponse }) {
  const { plan, meta } = response
  const view = buildDashboard(plan, meta)

  return (
    <article>
      <header className="mb-4">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400/70">
              BCI prototype dashboard
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
              {plan.title}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MetaChip>{meta.graphSource}</MetaChip>
            <MetaChip>
              {meta.generator === 'llm' ? (meta.model ?? 'llm') : 'deterministic fallback'}
            </MetaChip>
            <MetaChip>{formatTimestamp(meta.generatedAt)}</MetaChip>
          </div>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">{view.summaryLead}</p>
      </header>

      <SummaryMetrics metrics={view.metrics} />

      <div className="mt-3">
        <InsightCallouts callouts={view.callouts} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <OverviewPanel plan={plan} view={view} className="md:col-span-2 xl:col-span-1" />
        <ElectrodeSignalPanel plan={plan} />
        <NextActionsPanel actions={view.nextActions} />
        <PipelinePanel steps={plan.pipeline} className="md:col-span-2" />
        <ConfoundsPanel confounds={plan.confounds} className="md:col-span-2" />
        <ProtocolPanel steps={plan.protocol} />
        <ValidationPanel validation={plan.validation} firstMetric={view.firstMetric} />
        <ReasoningPanel steps={plan.reasoningPath} className="md:col-span-2 xl:col-span-3" />
        <DatasetsPanel
          datasets={plan.relevantDatasets}
          className="md:col-span-2 xl:col-span-3"
        />
      </div>
    </article>
  )
}

function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
      {children}
    </span>
  )
}

/** Locale-independent UTC formatting so server and client markup match. */
function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)} UTC`
}
