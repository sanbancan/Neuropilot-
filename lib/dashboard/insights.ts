import type { DesignPlanMeta, PrototypePlan } from '@/types/neuropilot'

/** Presentation only: preserve validated backend wording, ordering, and units. */
export type MetricTone = 'default' | 'accent' | 'caution'

export interface MetricCard {
  label: string
  value: string
  sub?: string
  tone?: MetricTone
}

export interface InsightCallout {
  label: string
  value: string
  sub?: string
  /** Allow the value two lines instead of one. */
  multiline?: boolean
}

export interface NextAction {
  eyebrow: string
  action: string
  rationale: string
}

export interface DashboardViewModel {
  metrics: MetricCard[]
  callouts: InsightCallout[]
  nextActions: NextAction[]
  summaryLead: string
  firstMetric: string
}

export function buildDashboard(plan: PrototypePlan, meta: DesignPlanMeta): DashboardViewModel {
  const support = (section: PrototypePlan['claims'][number]['section']) => {
    const claims = plan.claims.filter(claim => claim.section === section)
    if (claims.some(claim => claim.kind === 'provisional_engineering_recommendation')) return 'Provisional engineering proposal'
    if (claims.some(claim => ['engineering_recommendation', 'scientific_evidence'].includes(claim.kind))) return 'Reviewed source support; suitability remains to be evaluated'
    return 'See component rationale, questions and evidence gaps'
  }
  return {
    metrics: [
      { label: 'Paradigm', value: plan.paradigm.name },
      { label: 'Modality', value: plan.modality },
      { label: 'Signals', value: plan.neuralTarget.signals.join(' · ') || 'Deferred', sub: support('neuralTarget') },
      { label: 'Electrodes', value: plan.electrodes.recommended.join(' · ') || 'Deferred', sub: support('electrodes') },
      { label: 'Sampling', value: plan.sampling.recommendation ?? 'Deferred', sub: support('sampling') },
      { label: 'Classifier', value: plan.classifier?.name ?? 'Deferred', sub: support('classifier') },
      { label: 'Features', value: plan.features.join(' · ') || 'Deferred', sub: support('features') },
      { label: 'Generation', value: meta.generator === 'llm' ? 'AI-generated proposal' : 'Catalog starting point' },
    ],
    callouts: [
      { label: 'Paradigm rationale', value: plan.paradigm.reason, multiline: true },
      { label: 'Signal rationale', value: plan.neuralTarget.reason, multiline: true },
      { label: 'Sampling rationale', value: plan.sampling.reason, multiline: true },
      { label: 'Classifier rationale', value: plan.classifier?.reason ?? 'No supported decoder selected.', multiline: true },
    ],
    nextActions: plan.nextActions.map((item, index) => ({
      eyebrow: `Proposal ${index + 1}`,
      action: item.action,
      rationale: item.rationale,
    })),
    summaryLead: plan.summary,
    firstMetric: plan.validation[0] ?? 'No evaluation method supported yet.',
  }
}
