import type {
  DesignPlanMeta,
  ParadigmKey,
  PlanConfound,
  PrototypePlan,
} from '@/types/neuropilot'

/**
 * Client-side dashboard derivation for the results page.
 *
 * Transforms an existing `PrototypePlan` into at-a-glance metrics, insight
 * callouts, and next actions. Presentation only — no backend or schema
 * changes: every value is derived from fields the API already returns.
 */

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
  /** First sentence of the plan summary. */
  summaryLead: string
  /** Short label for the primary validation metric. */
  firstMetric: string
  /** Compact minimum-viable-setup line, e.g. "C3 · Cz · C4 @ ≥ 256 Hz". */
  minimumSetup: string
  /** Most likely practical bottleneck for this paradigm. */
  bottleneck: string
}

/**
 * Presentation-level readiness and complexity labels per paradigm.
 * Derived from the paradigm key in `meta`, not from new backend fields.
 */
const READINESS: Record<ParadigmKey, string> = {
  'motor-imagery': 'Testable design',
  ssvep: 'Testable design',
  'meditation-alpha': 'Exploratory study',
}

const COMPLEXITY: Record<ParadigmKey, string> = {
  'motor-imagery': 'Medium',
  ssvep: 'Medium',
  'meditation-alpha': 'Low',
}

const BOTTLENECK: Record<ParadigmKey, string> = {
  'motor-imagery': 'Collecting enough clean, balanced trials',
  ssvep: 'Stable stimulus display & visual fatigue',
  'meditation-alpha': 'Separating alpha from eye-state effects',
}

export function buildDashboard(plan: PrototypePlan, meta: DesignPlanMeta): DashboardViewModel {
  const electrodes = plan.electrodes.recommended
  const signals = plan.neuralTarget.signals
  const mainRisk = plan.confounds[0]?.name ?? '—'
  const firstExperiment = pickFirstExperiment(plan.protocol)

  const electrodeValue = electrodes.slice(0, 3).join(' · ')
  const electrodeExtra =
    electrodes.length > 3 ? `+${electrodes.length - 3} more` : undefined
  const signalSub =
    signals.length === 2
      ? `+ ${signals[1]}`
      : signals.length > 2
        ? `+${signals.length - 1} more`
        : undefined

  const metrics: MetricCard[] = [
    { label: 'Paradigm', value: plan.paradigm.name },
    { label: 'Modality', value: plan.modality },
    { label: 'Primary signal', value: signals[0] ?? '—', sub: signalSub },
    { label: 'Key electrodes', value: electrodeValue, sub: electrodeExtra },
    { label: 'Sampling', value: shortSampling(plan.sampling.recommendation) },
    { label: 'Readiness', value: READINESS[meta.paradigmKey], tone: 'accent' },
    { label: 'Complexity', value: COMPLEXITY[meta.paradigmKey] },
    { label: 'Main risk', value: mainRisk, tone: 'caution' },
  ]

  const callouts: InsightCallout[] = [
    {
      label: 'Best starting point',
      value: plan.paradigm.name,
      sub: `${plan.modality} · ${electrodeValue}${electrodeExtra ? ` ${electrodeExtra}` : ''}`,
    },
    {
      label: 'Most important caution',
      value: mainRisk,
      sub: plan.confounds[0]?.detail,
    },
    {
      label: 'Lowest-risk first experiment',
      value: firstExperiment.title,
      sub: firstExperiment.detail,
    },
    {
      label: 'Why this setup',
      value: plan.paradigm.reason,
      multiline: true,
    },
  ]

  const nextActions: NextAction[] = [
    {
      eyebrow: 'Setup',
      action: `Record from ${electrodeValue}${electrodes.length > 3 ? ' …' : ''}`,
      rationale: plan.electrodes.reason,
    },
    {
      eyebrow: 'First experiment',
      action: firstExperiment.title,
      rationale: firstExperiment.detail,
    },
    {
      eyebrow: 'Modeling',
      action: `Start with ${plan.classifier.name}`,
      rationale: plan.classifier.reason,
    },
  ]

  return {
    metrics,
    callouts,
    nextActions,
    summaryLead: firstSentence(plan.summary),
    firstMetric: shortMetric(plan.validation[0] ?? 'Cross-validation'),
    minimumSetup: `${electrodeValue} @ ${shortSampling(plan.sampling.recommendation)}`,
    bottleneck: BOTTLENECK[meta.paradigmKey],
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** "256 Hz or higher" → "≥ 256 Hz"; leaves unmatched text as-is. */
function shortSampling(recommendation: string): string {
  const match = recommendation.match(/(\d+(?:\.\d+)?)\s*Hz/i)
  return match ? `≥ ${match[1]} Hz` : recommendation
}

/** "Cross-Validation: Repeated balanced trials…" → "Cross-Validation". */
function shortMetric(validation: string): string {
  const colon = validation.indexOf(':')
  if (colon > 0 && colon <= 32) return validation.slice(0, colon)
  return validation
}

function firstSentence(summary: string): string {
  const end = summary.indexOf('. ')
  return end === -1 ? summary : summary.slice(0, end + 1)
}

/**
 * Pick the protocol step that represents the first real experiment —
 * the recording/trials step rather than preparation.
 */
function pickFirstExperiment(
  protocol: PrototypePlan['protocol'],
): PrototypePlan['protocol'][number] {
  const matched = protocol.find((step) =>
    /trial|session|record|baseline|gaze|meditation condition/i.test(step.title),
  )
  return matched ?? protocol[1] ?? protocol[0]
}

// ---------------------------------------------------------------------------
// Confound mitigation glossary
// ---------------------------------------------------------------------------

/**
 * Presentation-level "what to check" hints for confound names whose graph
 * context carries no mitigation. A small glossary — no backend change:
 * more specific patterns are listed first so they win over generic ones.
 */
const MITIGATION_HINTS: { match: RegExp; hint: string }[] = [
  {
    match: /too few trials|trial count/i,
    hint: 'Collect at least 40 trials per class before trusting accuracy.',
  },
  {
    match: /eye closure|eyes closed/i,
    hint: 'Record eyes-open and eyes-closed baselines to separate the confound.',
  },
  {
    match: /emg|muscle|actual (?:hand )?movement|movement artifact/i,
    hint: 'Instruct stillness and reject high-variance epochs; add an EMG screen if channels allow.',
  },
  {
    match: /eye|blink|ocular/i,
    hint: 'Apply ICA or threshold rejection and inspect surviving epochs visually.',
  },
  {
    match: /drowsiness|sleep/i,
    hint: 'Keep runs short and watch for slow drift before it contaminates blocks.',
  },
  {
    match: /fatigue/i,
    hint: 'Insert rest breaks and keep recording blocks under ~10 minutes.',
  },
  {
    match: /attention/i,
    hint: 'Add catch trials or post-run reports to confirm attention stayed on task.',
  },
]

/**
 * Mitigation copy for a confound card: graph-provided mitigation first,
 * then a presentation-level hint, then a generic fallback.
 */
export function mitigationFor(confound: PlanConfound): string {
  if (confound.mitigation) return confound.mitigation
  return (
    MITIGATION_HINTS.find((entry) => entry.match.test(confound.name))?.hint ??
    'Monitor across repeated sessions and reject affected trials.'
  )
}
