/**
 * Deterministic fallback plan builder for NeuroPilot.
 *
 * When OpenAI is unavailable (missing key, API error, or Zod validation
 * failure after retry), this module constructs a valid `PrototypePlan`
 * directly from the retrieved `ParadigmContext`.
 *
 * The fallback does NOT invent scientific knowledge — it assembles a
 * plan from the structured graph data, using the same signals, electrodes,
 * features, and classifiers the graph provides.
 */

import type { PrototypePlan } from '@/lib/schemas/design'
import type { ParadigmContext } from '@/lib/graph/types'

/**
 * Build a deterministic `PrototypePlan` from a `ParadigmContext`.
 *
 * This plan is intentionally conservative — it presents the graph's
 * recommended defaults as a starting point for the user.
 */
export function buildFallbackPlan(params: {
  goal: string
  modality: string
  hardware?: string
  constraints?: string
  context: ParadigmContext
}): PrototypePlan {
  const { goal, modality, hardware, constraints, context } = params

  // Title & summary
  const title = `${context.paradigmName} Prototype Plan`
  const summary = buildSummary(goal, context)

  // Paradigm
  const paradigm = {
    name: context.paradigmName,
    reason: `The objective "${truncate(goal, 80)}" aligns with ${context.paradigmName} based on keyword analysis.`,
  }

  // Modality
  const modalityRec = modality === 'unknown' ? context.modality : modality

  // Neural target
  const neuralTarget = {
    signals: context.signals.map(s => s.name),
    brainRegions: context.brainRegions.map(r => r.name),
    reason: context.signals.length > 0
      ? `Primary signals: ${context.signals.map(s => s.name).join(', ')}. These are ${evidenceLabel(context)} markers associated with ${context.paradigmName.toLowerCase()}.`
      : `Graph context identifies ${context.paradigmName} as the closest supported paradigm.`,
  }

  // Electrodes
  const electrodes = {
    recommended: context.electrodes.map(e => e.name),
    reason: context.electrodes.length > 0
      ? `Recommended electrodes based on graph topology: ${context.electrodes.map(e => `${e.name} (${e.description ?? 'standard placement'})`).join('; ')}.`
      : 'See paradigm documentation for electrode placement.',
  }

  // Hardware
  const hwRequirements = buildHardwareRequirements(hardware, context)
  const hwReason = context.hardware.length > 0
    ? `Compatible hardware from graph: ${context.hardware.map(h => h.name).join(', ')}.`
    : 'No specific hardware constraints from graph context.'

  // Sampling
  const sampling = buildSamplingRecommendation(context)

  // Protocol
  const protocol = buildProtocol(context)

  // Pipeline
  const pipeline = context.processingMethods.map(p => ({
    title: p.name,
    detail: p.description ?? `Processing stage${p.stage ? ` ${p.stage}` : ''} from graph context.`,
  }))
  if (pipeline.length === 0) {
    pipeline.push({ title: 'Band-pass filter', detail: 'Apply a standard band-pass filter appropriate for the paradigm.' })
  }

  // Features
  const features = context.features.map(f => f.name)
  if (features.length === 0) {
    features.push('Band power')
  }

  // Classifier
  const classifier = buildClassifierRecommendation(context)

  // Validation
  const validation = context.validationMethods.map(v => `${v.name}: ${v.description ?? 'Standard validation approach.'}`)
  if (validation.length === 0) {
    validation.push('Cross-validation with chance-level comparison')
  }

  // Confounds
  const confounds = [
    ...context.confounds.map(c => ({
      name: c.name,
      detail: c.description ?? 'Potential confound identified in graph context.',
      mitigation: undefined as string | undefined,
    })),
    ...context.artifacts.map(a => ({
      name: a.name,
      detail: a.description ?? 'Signal artifact.',
      mitigation: 'Standard artifact rejection or ICA correction.' as string | undefined,
    })),
  ]
  if (confounds.length === 0) {
    confounds.push({ name: 'General noise', detail: 'Environmental and physiological noise.', mitigation: 'Shielded recording environment and artifact rejection.' })
  }

  // Assumptions
  const assumptions = buildAssumptions(context)

  // Limitations
  const limitations = buildLimitations(context)

  // Reasoning path — directly from graph context
  const reasoningPath = context.reasoningPath.map(r => ({
    from: r.from,
    relationship: r.relationship,
    to: r.to,
    evidence: r.evidence,
    note: r.note,
  }))
  if (reasoningPath.length === 0) {
    reasoningPath.push({
      from: context.paradigmName,
      relationship: 'USES_MODALITY' as const,
      to: context.modality,
      evidence: 'established' as const,
      note: undefined,
    })
  }

  // Datasets — only from graph context
  const relevantDatasets = context.datasets.map(d => ({
    name: d.name,
    url: d.url,
    why: d.useCases.length > 0 ? d.useCases.join('; ') : `Relevant to ${context.paradigmName} research.`,
    synthetic: d.synthetic,
  }))

  // Constraints note
  const constraintsNote = constraints ? ` User constraints: ${constraints}` : ''

  return {
    title,
    summary: summary + constraintsNote,
    paradigm,
    modality: modalityRec,
    neuralTarget,
    electrodes,
    hardware: {
      requirements: hwRequirements,
      reason: hwReason + (hardware ? ` User has: ${hardware}.` : ''),
    },
    sampling,
    protocol,
    pipeline,
    features,
    classifier,
    validation,
    confounds,
    assumptions,
    limitations,
    reasoningPath,
    relevantDatasets,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s
}

function buildSummary(goal: string, ctx: ParadigmContext): string {
  return `Deterministic prototype plan for: "${truncate(goal, 100)}". ` +
    `Based on ${ctx.source === 'neo4j' ? 'Neo4j knowledge graph' : 'in-memory graph mirror'} context for ${ctx.paradigmName}. ` +
    `This plan was generated without LLM assistance — it reflects the graph's recommended defaults.`
}

function evidenceLabel(ctx: ParadigmContext): string {
  const hasExploratory = ctx.reasoningPath.some(r => r.evidence === 'exploratory')
  return hasExploratory ? 'exploratory' : 'established'
}

function buildHardwareRequirements(
  userHardware: string | undefined,
  ctx: ParadigmContext,
): string[] {
  const reqs: string[] = []
  if (ctx.hardware.length > 0) {
    for (const h of ctx.hardware) {
      reqs.push(`${h.name}${h.channels ? ` (${h.channels} channels)` : ''}`)
    }
  }
  if (userHardware) {
    reqs.unshift(`User-provided: ${userHardware}`)
  }
  return reqs
}

function buildSamplingRecommendation(ctx: ParadigmContext): {
  recommendation: string
  reason: string
} {
  const rates = ctx.hardware
    .map(h => h.samplingRateHz)
    .filter((r): r is number => typeof r === 'number')

  if (rates.length > 0) {
    const maxRate = Math.max(...rates)
    return {
      recommendation: `${maxRate} Hz or higher`,
      reason: `Highest sampling rate among compatible hardware: ${ctx.hardware.filter(h => h.samplingRateHz).map(h => h.name).join(', ')}.`,
    }
  }

  return {
    recommendation: '250 Hz',
    reason: '250 Hz is a common default for EEG BCI prototypes and sufficient for most paradigms.',
  }
}

function buildProtocol(ctx: ParadigmContext): { title: string; detail: string }[] {
  const steps: { title: string; detail: string }[] = [
    { title: 'Preparation', detail: 'Fit EEG cap/headset, verify impedance, and ensure the participant is comfortable.' },
  ]

  switch (ctx.paradigmKey) {
    case 'motor-imagery':
      steps.push(
        { title: 'Cue-based trial structure', detail: 'Present visual cues indicating which hand to imagine moving (left or right). Each trial: 2 s baseline → cue → 4 s imagery → 2 s rest.' },
        { title: 'Trial count', detail: 'Aim for at least 40 trials per class in the initial session.' },
        { title: 'Rest breaks', detail: 'Include rest periods every 20 trials to reduce fatigue.' },
      )
      break
    case 'ssvep':
      steps.push(
        { title: 'Stimulus display', detail: 'Present flickering visual targets at distinct frequencies (e.g. 7, 12, 15 Hz). Ensure targets are spatially separated.' },
        { title: 'Gaze trials', detail: 'Instruct the participant to fixate on a cued target for 3–5 s per trial.' },
        { title: 'Rest breaks', detail: 'Include breaks every 15–20 trials to reduce visual fatigue.' },
      )
      break
    case 'meditation-alpha':
      steps.push(
        { title: 'Baseline (eyes open)', detail: 'Record 2–3 minutes of resting EEG with eyes open, fixating on a point.' },
        { title: 'Baseline (eyes closed)', detail: 'Record 2–3 minutes with eyes closed — this is the critical control condition.' },
        { title: 'Meditation condition', detail: 'Record during the participant\'s preferred meditation practice (5–10 minutes).' },
        { title: 'Post-meditation rest', detail: 'Record 2–3 minutes of eyes-closed rest after meditation.' },
      )
      break
  }

  return steps
}

function buildClassifierRecommendation(ctx: ParadigmContext): {
  name: string
  reason: string
} {
  if (ctx.classifiers.length > 0) {
    const primary = ctx.classifiers[0]!
    return {
      name: primary.name,
      reason: primary.description ?? `Recommended classifier for ${ctx.paradigmName} from graph context.`,
    }
  }
  return {
    name: 'Linear Discriminant Analysis',
    reason: 'LDA is a robust default classifier for BCI prototypes when graph context does not specify one.',
  }
}

function buildAssumptions(ctx: ParadigmContext): string[] {
  const assumptions: string[] = [
    `The user's objective aligns with ${ctx.paradigmName} as identified by the paradigm detector.`,
    `EEG is the primary recording modality${ctx.modality ? ` (graph-recommended: ${ctx.modality})` : ''}.`,
  ]

  if (ctx.paradigmKey === 'meditation-alpha') {
    assumptions.push('Alpha power changes are investigated as a possible correlate — not as proof of meditative state.')
    assumptions.push('The participant has some familiarity with meditation practice.')
  }

  if (ctx.paradigmKey === 'motor-imagery') {
    assumptions.push('The user is targeting a two-class (left vs. right) discrimination task.')
    assumptions.push('The participant can sustain motor imagery for 3–4 seconds per trial.')
  }

  if (ctx.paradigmKey === 'ssvep') {
    assumptions.push('The user has access to a display capable of rendering flickering stimuli at stable frequencies.')
    assumptions.push('The participant has normal or corrected-to-normal vision.')
  }

  return assumptions
}

function buildLimitations(ctx: ParadigmContext): string[] {
  const limitations: string[] = [
    'This is a starting-point prototype plan — iterative refinement is expected.',
    'The plan is based on graph context which may not cover all relevant literature.',
    'Individual differences in BCI aptitude may require protocol adjustments.',
  ]

  if (ctx.paradigmKey === 'meditation-alpha') {
    limitations.push('Alpha activity alone cannot confirm that meditation is occurring — it reflects multiple cognitive and physiological states.')
    limitations.push('Eye state (open vs. closed) is a major confound that must be controlled for in any alpha-meditation analysis.')
  }

  if (ctx.paradigmKey === 'motor-imagery') {
    limitations.push('MI classification accuracy varies significantly across individuals; some users may be "BCI illiterate" for this paradigm.')
    limitations.push('EMG contamination in the mu/beta bands is a known challenge.')
  }

  if (ctx.paradigmKey === 'ssvep') {
    limitations.push('Visual fatigue limits session duration for SSVEP paradigms.')
    limitations.push('Stimulus frequencies must be carefully chosen to avoid harmonic overlap between targets.')
  }

  return limitations
}
