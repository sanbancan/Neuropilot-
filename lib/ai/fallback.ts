/** Transparent catalog result. No invented protocol timings, montages, or classifiers. */
import type { PrototypePlan } from '@/lib/schemas/design'
import type { ParadigmContext } from '@/lib/graph/types'
import type { ObjectiveInterpretation } from '@/lib/schemas/knowledge'
import { hasReviewedHardwareSpecification } from '@/lib/graph/retrieve'

export function buildFallbackPlan(params: { goal: string; modality: string; hardware?: string; constraints?: string; context: ParadigmContext; interpretation?: ObjectiveInterpretation }): PrototypePlan {
  const { context, interpretation } = params
  const questions = [...(interpretation?.questions || []), ...context.conflicts.map(conflict => `Please resolve: ${conflict}`)]
  const modalityMismatch = params.modality !== 'unknown' && params.modality !== context.modality
  const state = modalityMismatch ? 'unsupported' : context.conflicts.length || context.paradigmKey === 'unknown' ? 'clarification_required'
    : context.coverage.status === 'incompatible' ? 'unsupported'
    : context.coverage.status === 'missing' || context.coverage.reviewedRelationships === 0 ? 'insufficient_evidence' : 'partial'
  const canDesign = state === 'partial'
  const reviewed = (key: string) => canDesign && context.relationships.some(edge => edge.verification === 'reviewed' && (edge.fromKey === key || edge.toKey === key))
  const device = context.hardware.length === 1 && reviewed(context.hardware[0].key) && hasReviewedHardwareSpecification(context.hardware[0], context.sources) ? context.hardware[0] : null
  const classifiers = context.classifiers.filter(node => reviewed(node.key))
  const classifier = classifiers.length === 1 ? classifiers[0] : null
  const signals = context.signals.filter(node => reviewed(node.key))
  const regions = context.brainRegions.filter(node => reviewed(node.key))
  const electrodeOptions = context.electrodes.filter(node => reviewed(node.key))
  const limit = Math.min(context.requirements.availableChannels ?? Infinity, device?.channels ?? Infinity)
  const electrodes = electrodeOptions.length <= limit ? electrodeOptions : []
  const methods = context.processingMethods.filter(node => reviewed(node.key))
  const features = context.features.filter(node => reviewed(node.key))
  const protocols = context.protocols.filter(node => reviewed(node.key))
  const validation = context.validationMethods.filter(node => reviewed(node.key))
  const gaps = [...new Set([
    ...context.coverage.missingSections.map(section => `${context.coverage.provisionalSections?.includes(section) ? 'Catalog context exists but independent review is missing' : 'Evidence or requirements missing'} for ${section}.`),
    ...context.coverage.issues, ...context.conflicts,
    ...(context.hardware.length > 1 ? ['Acquisition device selection is unresolved; catalog candidates are alternatives, not a selected system.'] : []),
    'Catalog starting point assembled without AI personalization. Hardware suitability and user constraints have not been fully evaluated.',
  ])]
  if (modalityMismatch || context.coverage.status === 'incompatible') gaps.push(`Requested modality ${params.modality} is not supported by this catalog context.`)
  if (!questions.length && state === 'clarification_required') questions.push('Please clarify the objective and intended BCI interaction.')
  if (context.paradigmKey === 'meditation-alpha') gaps.push('Alpha activity is not proof of meditation. Eye state and drowsiness must be considered; the legacy catalog does not establish a validated meditation detector.')
  const plan: PrototypePlan = {
    status: state, questions, gaps, claims: [],
    title: `${context.paradigmName} Catalog Starting Point`,
    summary: 'Deterministic catalog response, not a personalized or experimentally validated design.',
    paradigm: { name: context.paradigmName, reason: `Recognized objective: ${params.goal}. Knowledge coverage: ${context.coverage.status}.` },
    modality: modalityMismatch ? params.modality : context.modality,
    neuralTarget: { signals: signals.map(node => node.name), brainRegions: regions.map(node => node.name), reason: 'Only targets with reviewed retrieved relationships are proposed; others are deferred.' },
    electrodes: { recommended: electrodes.map(node => node.name), reason: 'Montage selection is deferred unless reviewed relationships support the sites.' },
    hardware: { deviceKey: device?.key || null, requirements: device ? [`${device.name}: ${device.channels ?? 'unspecified'} channels`] : [], reason: device?.notes || 'Device selection and suitability remain unresolved.' },
    sampling: { rateHz: device?.samplingRateHz || null, recommendation: device?.samplingRateHz ? `${device.samplingRateHz} Hz` : null, reason: 'Only a reviewed manufacturer acquisition mode may be proposed; no minimum rate is inferred.' },
    protocol: protocols.map(node => ({ title: node.name, detail: node.description || 'Consult the cited protocol source.' })),
    pipeline: methods.map(node => ({ title: node.name, detail: node.description || 'Consult the cited method source.' })),
    features: features.map(node => node.name),
    classifier: classifier ? { name: classifier.name, reason: classifier.description || 'Candidate supported by the retrieved publication.' } : null,
    nextActions: [{ action: questions.length ? questions[0] : 'Review the evidence gaps and supply missing project requirements.', rationale: 'Unsupported acquisition, decoding, and deployment details must remain deferred.' }],
    validation: validation.map(node => node.description || node.name),
    confounds: canDesign ? [...context.confounds, ...context.artifacts].map(node => ({ name: node.name, detail: node.description || 'Unverified catalog caution; review required.', mitigation: null })) : [],
    assumptions: ['User-supplied constraints are requirements, not verified hardware specifications.'],
    limitations: [...gaps, ...(params.hardware || params.constraints ? [`Inputs retained for review: hardware ${params.hardware || 'unspecified'}; constraints ${params.constraints || 'unspecified'}.`] : [])],
    reasoningPath: context.reasoningPath.map(step => ({ ...step, relationshipId: step.relationshipId!, sourceIds: step.sourceIds || [], verification: step.verification || 'unverified' })),
    relevantDatasets: context.datasets.filter(node => reviewed(node.key)).map(node => ({ name: node.name, url: node.url, synthetic: node.synthetic, why: `${node.useCases.join('; ')}. Limitations: ${node.limitations.join('; ')}` })),
    deployment: { target: context.requirements.deploymentTarget, recommendations: [], tradeoffs: [] }, alternatives: [],
  }
  const sections: [PrototypePlan['claims'][number]['section'], { key: string }[]][] = [
    ['neuralTarget', [...signals, ...regions]], ['electrodes', electrodes], ['hardware', device ? [device] : []],
    ['sampling', device?.samplingRateHz ? [device] : []], ['pipeline', methods], ['features', features],
    ['classifier', classifier ? [classifier] : []], ['protocol', protocols], ['validation', validation],
  ]
  for (const [section, nodes] of sections) for (const node of nodes) {
    const edge = context.relationships.find(edge => edge.verification === 'reviewed' && (edge.fromKey === node.key || edge.toKey === node.key))!
    plan.claims.push({ section, kind: 'engineering_recommendation', statement: `Catalog candidate for ${section}; project-specific suitability remains unverified.`, relationshipIds: [edge.id!], sourceIds: edge.sourceIds || [] })
  }
  return plan
}
