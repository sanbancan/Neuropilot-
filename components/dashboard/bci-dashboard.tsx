import type { ReactNode } from 'react'

import { ConfoundsPanel } from '@/components/dashboard/confounds-panel'
import { DatasetsPanel } from '@/components/dashboard/datasets-panel'
import { ElectrodeSignalPanel } from '@/components/dashboard/electrode-signal-panel'
import { InsightCallouts } from '@/components/dashboard/insight-callouts'
import { NextActionsPanel } from '@/components/dashboard/next-actions-panel'
import { OverviewPanel } from '@/components/dashboard/overview-panel'
import { Panel } from '@/components/dashboard/panel'
import { PipelinePanel } from '@/components/dashboard/pipeline-panel'
import { ProtocolPanel } from '@/components/dashboard/protocol-panel'
import { SummaryMetrics } from '@/components/dashboard/summary-metrics'
import { ValidationPanel } from '@/components/dashboard/validation-panel'
import { buildDashboard } from '@/lib/dashboard/insights'
import type { DesignResponse } from '@/types/neuropilot'

/**
 * Compact, panel-based BCI prototype dashboard for the results page.
 *
 * Renders validated backend fields without adding scientific advice.
 * Layout: summary cards → rationales →
 * a responsive 1/2/3-column panel grid.
 */
export function BciDashboard({ response }: { response: DesignResponse }) {
  const { plan, meta } = response
  const view = buildDashboard(plan, meta)
  const statusLabels = {
    complete: 'Complete design proposal', partial: 'Partial design — evidence or requirements missing',
    clarification_required: 'Clarification required', unsupported: 'Unsupported requirements',
    insufficient_evidence: 'Insufficient scientific evidence',
  }

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
              {meta.generator === 'llm' ? `${meta.provider?.name ? `${meta.provider.name} · ` : ''}${meta.model ?? 'llm'}` : 'catalog starting point'}
            </MetaChip>
            {meta.generator === 'fallback' && meta.provider ? <MetaChip>Configured: {meta.provider.name} · {meta.provider.model}</MetaChip> : null}
            <MetaChip>{formatTimestamp(meta.generatedAt)}</MetaChip>
          </div>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">{view.summaryLead}</p>
      </header>

      <div role="status" className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-4 text-sm text-zinc-300">
        <p className="font-semibold">
          {meta.generator === 'llm' ? 'AI-generated proposal' : 'Deterministic catalog starting point'}
        </p>
        {meta.fallbackReason ? (
          <p className="mt-1">{meta.fallbackReason.message} This result uses predefined catalog templates; hardware suitability and constraints have not been evaluated.</p>
        ) : null}
        {meta.diagnostics ? <p className="mt-2 text-xs">Design synthesis: {meta.diagnostics.synthesis}; gate: {meta.diagnostics.gate}; attempts: {meta.attempts}{meta.fallbackReason ? `; failure: ${meta.fallbackReason.code}` : ''}{meta.diagnostics.validationCategories.length ? `; checks: ${meta.diagnostics.validationCategories.join(', ')}` : ''}. Interpretation: {meta.interpretationMethod}{meta.interpretationFailure ? ` (${meta.interpretationFailure.code})` : ''}.</p> : null}
        <p className="mt-2 font-semibold">{statusLabels[plan.status]}</p>
        <p className="mt-1">Knowledge coverage: {meta.coverage.status}. Reviewed relationships: {meta.coverage.reviewedRelationships}; unverified: {meta.coverage.unverifiedRelationships}.</p>
        {meta.retrieval.reason ? <p className="mt-1">Catalog retrieval: {meta.retrieval.reason === 'database_unavailable' ? 'Neo4j unavailable; offline catalog used.' : 'Offline catalog used; Neo4j is not configured.'}</p> : null}
        {meta.interpretationFailure ? <p className="mt-1">{meta.interpretationFailure.message}</p> : null}
        {meta.coverage.provisionalSections?.length ? <p className="mt-1">Catalog context available for provisional proposals: {meta.coverage.provisionalSections.join(', ')}. These relationships have not been independently verified.</p> : null}
        <div className="mt-2 flex flex-wrap gap-2">{[...new Set(plan.claims.map(claim => claim.section))].map(section => <MetaChip key={section}>{section}: {plan.claims.some(claim => claim.section === section && claim.kind === 'provisional_engineering_recommendation') ? 'Provisional engineering proposal' : plan.claims.some(claim => claim.section === section && ['scientific_evidence', 'engineering_recommendation'].includes(claim.kind)) ? 'Reviewed source support' : 'Assumption'}</MetaChip>)}</div>
        <p className="mt-1">No experimental results are supplied. Recommendations and proposed checks have not been experimentally validated.</p>
      </div>
      {(plan.questions.length > 0 || plan.gaps.length > 0) ? (
        <Panel eyebrow="Requirements & evidence" title="Questions & Gaps" className="mb-4">
          {plan.questions.length ? <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-200">{plan.questions.map((item, index) => <li key={index}>{item}</li>)}</ul> : null}
          {plan.gaps.length ? <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-400">{plan.gaps.map((item, index) => <li key={index}>{item}</li>)}</ul> : null}
        </Panel>
      ) : null}
      <SummaryMetrics metrics={view.metrics} />

      <div className="mt-3">
        <InsightCallouts callouts={view.callouts} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <OverviewPanel plan={plan} className="md:col-span-2 xl:col-span-1" />
        <ElectrodeSignalPanel plan={plan} />
        <NextActionsPanel actions={view.nextActions} />
        <PipelinePanel steps={plan.pipeline} className="md:col-span-2" />
        <ConfoundsPanel confounds={plan.confounds} className="md:col-span-2" />
        <ProtocolPanel steps={plan.protocol} />
        <ValidationPanel validation={plan.validation} firstMetric={view.firstMetric} />
        <Panel eyebrow="Acquisition" title="Hardware & Sampling" className="md:col-span-2">
          <ul className="space-y-2 text-sm text-zinc-300">
            {plan.hardware.requirements.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
          <p className="mt-3 text-sm text-zinc-400">{plan.hardware.reason}</p>
          <p className="mt-3 text-sm text-zinc-200">{plan.sampling.recommendation}</p>
          <p className="mt-1 text-sm text-zinc-400">{plan.sampling.reason}</p>
        </Panel>
        <Panel eyebrow="Scope" title="Assumptions & Limitations" className="md:col-span-2 xl:col-span-3">
          <h3 className="text-sm font-semibold text-zinc-200">Assumptions</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-zinc-400">
            {plan.assumptions.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
          <h3 className="mt-4 text-sm font-semibold text-zinc-200">Limitations</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-zinc-400">
            {plan.limitations.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        </Panel>
        <Panel eyebrow="Catalog context" title="Supporting Reasoning" className="md:col-span-2 xl:col-span-3">
          <p className="text-xs text-zinc-500">Evidence labels describe catalog assertions; they do not establish experimental validation.</p>
          <ul className="mt-3 space-y-2 text-sm text-zinc-300">
            {plan.reasoningPath.map((step, index) => (
              <li key={index}>
                {step.from} → {step.relationship} → {step.to}
                {step.evidence ? ` (${step.evidence})` : ''}
                {step.note ? ` — ${step.note}` : ''}
                {` [${step.verification}; ${step.sourceIds.join(', ') || 'no source'}]`}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel eyebrow="Design considerations" title="Deployment & Alternatives" className="md:col-span-2 xl:col-span-3">
          <p className="text-sm text-zinc-300">Deployment target: {plan.deployment.target || 'Not specified'}</p>
          <ul className="mt-2 space-y-2 text-sm text-zinc-400">{[...plan.deployment.recommendations, ...plan.deployment.tradeoffs].map((item, index) => <li key={index}>{item}</li>)}</ul>
          <ul className="mt-3 space-y-2 text-sm text-zinc-400">{plan.alternatives.map((item, index) => <li key={index}>{item.name}: {item.tradeoff} [{item.sourceIds.join(', ')}]</li>)}</ul>
        </Panel>
        <Panel eyebrow="Attribution" title="Claims & Scientific Sources" className="md:col-span-2 xl:col-span-3">
          <ul className="space-y-3 text-sm text-zinc-300">{plan.claims.map((claim, index) => <li key={index}>{claim.section} · {claim.kind === 'provisional_engineering_recommendation' ? 'Provisional engineering proposal — unverified catalog support' : claim.kind}: {claim.statement} [{claim.sourceIds.join(', ')}]</li>)}</ul>
          <ul className="mt-4 space-y-4 text-sm text-zinc-400">
            {meta.sources.map(source => <li key={source.id}>
              <p className="font-medium text-zinc-200">{source.title} — {source.verification}</p>
              <p>{source.authors.join(', ')} {source.year || ''} {source.venue || ''}</p>
              <p>{source.kind} · {source.id}{source.doi ? ` · DOI: ${source.doi}` : ''}</p>
              <p>{source.scope}</p>
              {source.url && /^https?:\/\//.test(source.url) ? <a className="text-cyan-400" href={source.url} target="_blank" rel="noopener noreferrer">Source documentation ↗</a> : null}
            </li>)}
          </ul>
        </Panel>
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
