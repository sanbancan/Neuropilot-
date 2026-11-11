/** Deterministic provenance, catalog membership, and technical consistency checks.
 * These checks do not establish scientific truth or replace expert review.
 */
import type { PrototypePlan } from '@/lib/schemas/design'
import type { ParadigmContext, GraphNodeLabel } from '@/lib/graph/types'
import { hasReviewedHardwareSpecification } from '@/lib/graph/retrieve'

export function validateScientificPlan(plan: PrototypePlan, context: ParadigmContext): string[] {
  const issues: string[] = []
  const sources = new Map(context.sources.map(source => [source.id, source]))
  const edges = new Map(context.relationships.map(edge => [edge.id, edge]))
  const reviewed = (key: string) => context.relationships.some(edge => edge.verification === 'reviewed' && (edge.fromKey === key || edge.toKey === key))
  const choice = (values: string[], nodes: { key: string; name: string }[], section: string) => {
    for (const value of values) {
      const node = nodes.find(candidate => candidate.name === value)
      const linked = node && context.relationships.some(edge =>
        (edge.fromKey === node.key || edge.toKey === node.key) && plan.claims.some(claim =>
          claim.section === section && !['assumption', 'experimental_observation'].includes(claim.kind) &&
          claim.relationshipIds.includes(edge.id!) &&
          (edge.verification === 'reviewed' || claim.kind === 'provisional_engineering_recommendation'),
        ),
      )
      if (!linked) issues.push(`${section}: ${value} lacks a reviewed or explicitly provisional retrieved relationship.`)
    }
  }
  choice(plan.neuralTarget.signals, context.signals, 'neuralTarget')
  choice(plan.neuralTarget.brainRegions, context.brainRegions, 'neuralTarget')
  choice(plan.electrodes.recommended, context.electrodes, 'electrodes')
  choice(plan.features, context.features, 'features')
  choice(plan.pipeline.map(step => step.title), context.processingMethods, 'pipeline')
  for (const step of plan.protocol) {
    if (context.protocols.some(node => node.name === step.title)) choice([step.title], context.protocols, 'protocol')
    else if (!plan.claims.some(claim => claim.section === 'protocol' && claim.kind === 'provisional_engineering_recommendation' && claim.statement.includes(step.title))) issues.push('Proposed protocol steps require explicit provisional claim annotations.')
  }
  if (plan.classifier) choice([plan.classifier.name], context.classifiers, 'classifier')
  if (plan.paradigm.name !== context.paradigmName) issues.push('Paradigm must match the interpreted and retrieved paradigm.')
  if (plan.modality !== context.modality) issues.push('Modality differs from the requested/retrieved modality.')
  if (plan.modality !== 'EEG' && plan.electrodes.recommended.length) issues.push('EEG electrode sites must not be recommended for a non-EEG modality.')
  const available = context.requirements.availableChannels
  if (available !== null && plan.electrodes.recommended.length > available) issues.push('Recommended electrodes exceed explicitly available channels.')
  if (context.requirements.electrodeSites.length && plan.electrodes.recommended.some(site => !context.requirements.electrodeSites.includes(site))) issues.push('Electrode recommendations conflict with the requested sites.')
  const device = context.hardware.find(node => node.key === plan.hardware.deviceKey && reviewed(node.key) && hasReviewedHardwareSpecification(node, context.sources))
  if (plan.hardware.deviceKey && !device) issues.push('Selected hardware has no reviewed retrieved configuration.')
  if (plan.hardware.requirements.length && !device) issues.push('Hardware recommendations require a documented device selection.')
  if (device) for (const requirement of plan.hardware.requirements) {
    for (const match of requirement.matchAll(/(\d+)\s*channels?/gi)) if (device.channels !== undefined && Number(match[1]) > device.channels) issues.push('Hardware text invents capacity beyond the manufacturer specification.')
    for (const match of requirement.matchAll(/(?:has|provides|supports|offers)\s+(\d+)\s*channels?/gi)) if (device.channels !== undefined && Number(match[1]) !== device.channels) issues.push('Hardware capacity assertion differs from the manufacturer specification.')
    for (const match of requirement.matchAll(/(\d+(?:\.\d+)?)\s*(k?hz)/gi)) if (Number(match[1]) * (match[2].toLowerCase() === 'khz' ? 1000 : 1) !== device.samplingRateHz) issues.push('Hardware text invents an undocumented sampling mode.')
  }
  if (device?.channels && plan.electrodes.recommended.length > device.channels) issues.push('Recommended electrodes exceed device channel capacity.')
  if (device?.channels && context.requirements.requiredChannels && device.channels < context.requirements.requiredChannels) issues.push('Selected device cannot meet the required channel count.')
  if (plan.sampling.rateHz !== null) {
    if (!device || device.samplingRateHz !== plan.sampling.rateHz) issues.push('Sampling rate is not a documented mode of the selected hardware.')
    if (context.requirements.samplingRateHz && context.requirements.samplingRateHz !== plan.sampling.rateHz) issues.push('Sampling conflicts with the requested rate.')
    const numbers = plan.sampling.recommendation?.match(/\d+(?:\.\d+)?/g)?.map(Number) || []
    if (numbers.length !== 1 || numbers[0] !== plan.sampling.rateHz || !/\bHz\b/.test(plan.sampling.recommendation || '')) issues.push('Sampling text must describe the documented rate in Hz without inventing other modes or limits.')
  } else if (plan.sampling.recommendation !== null) issues.push('Sampling recommendation requires a documented numeric rate.')
  for (const dataset of plan.relevantDatasets) {
    if (!context.datasets.some(node => node.name === dataset.name && node.url === dataset.url && node.synthetic === dataset.synthetic && reviewed(node.key))) issues.push('Dataset attribution or synthetic status does not match reviewed retrieval.')
  }
  for (const step of plan.reasoningPath) {
    const original = context.reasoningPath.find(item => item.relationshipId === step.relationshipId)
    if (!original || original.from !== step.from || original.to !== step.to || original.relationship !== step.relationship || original.verification !== step.verification || original.evidence !== (step.evidence ?? undefined) || original.note !== (step.note ?? undefined) || JSON.stringify(original.sourceIds || []) !== JSON.stringify(step.sourceIds)) issues.push('Reasoning path differs from the retrieved relationship or its evidence.')
  }
  const sectionLabels: Record<string, GraphNodeLabel[]> = {
    neuralTarget: ['NeuralSignal', 'BrainRegion'], electrodes: ['Electrode'], hardware: ['Hardware'], sampling: ['Hardware'],
    pipeline: ['ProcessingMethod'], features: ['Feature'], classifier: ['Classifier'], protocol: ['Protocol', 'Paradigm', 'ProcessingMethod'], validation: ['ValidationMethod'], deployment: ['Deployment'],
  }
  const sectionNodes = [
    { key: context.paradigmKey, label: 'Paradigm' as const }, ...context.signals, ...context.brainRegions, ...context.electrodes, ...context.hardware,
    ...context.processingMethods, ...context.features, ...context.classifiers, ...context.protocols, ...context.validationMethods, ...context.deployments,
  ]
  for (const claim of plan.claims) {
    if (claim.section === 'protocol' && claim.kind !== 'provisional_engineering_recommendation' && claim.relationshipIds.some(id => { const edge = edges.get(id); return edge && !context.protocols.some(node => edge.fromKey === node.key || edge.toKey === node.key) })) issues.push('Reviewed protocol claims require retrieved protocol evidence; derived steps must be provisional.')
    if (claim.kind === 'experimental_observation') issues.push('No experimental records were supplied; observations cannot be generated.')
    if (claim.sourceIds.some(id => !sources.has(id))) issues.push('Claim cites an unknown source.')
    if (claim.relationshipIds.some(id => !edges.has(id))) issues.push('Claim cites a relationship outside retrieval.')
    const citedEdges = claim.relationshipIds.map(id => edges.get(id)).filter(edge => edge !== undefined)
    if (claim.kind === 'engineering_recommendation' && citedEdges.some(edge => edge.verification !== 'reviewed')) issues.push('Unverified engineering recommendations must be explicitly provisional.')
    if (claim.kind === 'scientific_evidence' && (!claim.sourceIds.length || !citedEdges.length || claim.sourceIds.some(id => sources.get(id)?.verification !== 'reviewed' || sources.get(id)?.kind === 'curated_entry') || citedEdges.some(edge => edge.verification !== 'reviewed'))) issues.push('Scientific evidence requires reviewed external sources and reviewed relationships.')
    if (claim.kind !== 'assumption' && (!claim.sourceIds.length || !citedEdges.length)) issues.push('Recommendations must carry source and relationship provenance.')
    if (claim.sourceIds.some(id => !citedEdges.some(edge => edge.sourceIds?.includes(id))) || citedEdges.some(edge => !claim.sourceIds.some(id => edge.sourceIds?.includes(id)))) issues.push('Claim source is not attached to its cited relationships.')
    if (claim.kind !== 'assumption' && sectionLabels[claim.section] && citedEdges.some(edge => !sectionNodes.some(node => sectionLabels[claim.section].includes(node.label) && (edge.fromKey === node.key || edge.toKey === node.key)))) issues.push('Claim cites evidence for a different technical section.')
  }
  const populated: Record<string, boolean> = {
    neuralTarget: Boolean(plan.neuralTarget.signals.length || plan.neuralTarget.brainRegions.length),
    electrodes: Boolean(plan.electrodes.recommended.length), hardware: Boolean(plan.hardware.deviceKey),
    sampling: plan.sampling.rateHz !== null, pipeline: Boolean(plan.pipeline.length), features: Boolean(plan.features.length),
    classifier: plan.classifier !== null, protocol: Boolean(plan.protocol.length), validation: Boolean(plan.validation.length),
    deployment: Boolean(plan.deployment.recommendations.length),
  }
  for (const [section, exists] of Object.entries(populated)) {
    if (!exists) continue
    const linked = plan.claims.some(claim => claim.section === section && claim.kind !== 'assumption' && claim.relationshipIds.some(id => {
      const edge = edges.get(id)
      return edge && (edge.verification === 'reviewed' || claim.kind === 'provisional_engineering_recommendation') && sectionNodes.some(node => sectionLabels[section].includes(node.label) && (edge.fromKey === node.key || edge.toKey === node.key))
    }))
    if (!linked) issues.push(`${section} has no reviewed or explicitly provisional section-specific provenance.`)
  }
  if (plan.deployment.target !== context.requirements.deploymentTarget) issues.push('Deployment target must reflect the explicitly supplied requirement, including null when unknown.')
  for (const alternative of plan.alternatives) {
    const known = [...context.hardware, ...context.classifiers, ...context.features].find(node => node.name === alternative.name && (reviewed(node.key) || /provisional/i.test(alternative.tradeoff)) && (node.label !== 'Hardware' || hasReviewedHardwareSpecification(node, context.sources)))
    if (!known || !alternative.sourceIds.length || alternative.sourceIds.some(id => !sources.has(id) || !context.relationships.some(edge => (edge.fromKey === known.key || edge.toKey === known.key) && edge.sourceIds?.includes(id)))) issues.push('Alternative is not supported by retrieved candidate-specific provenance.')
  }
  if (plan.status === 'complete') {
    if (plan.claims.some(claim => claim.kind === 'provisional_engineering_recommendation')) issues.push('Complete plans cannot contain unresolved provisional recommendations; use partial.')
    if (context.coverage.status !== 'sufficient' || context.conflicts.length || plan.questions.length || plan.gaps.length) issues.push('Complete plans require sufficient coverage, resolved requirements, and no gaps/questions.')
    if (!plan.hardware.deviceKey || !plan.electrodes.recommended.length || !plan.pipeline.length || !plan.protocol.length || !plan.validation.length || !plan.features.length || !plan.deployment.target || !plan.deployment.recommendations.length || plan.sampling.rateHz === null || (context.paradigmKey !== 'meditation-alpha' && !plan.classifier)) issues.push('Complete design is missing essential supported recommendations.')
  }
  if (['unsupported', 'insufficient_evidence'].includes(plan.status) && !plan.gaps.length) issues.push('Non-design states must explain the evidence or compatibility gap.')
  if (context.conflicts.length && plan.status !== 'clarification_required') issues.push('Conflicting requirements must be resolved through clarification.')
  if (context.coverage.status === 'incompatible' && !['unsupported', 'clarification_required'].includes(plan.status)) issues.push('Incompatible modality cannot produce a design.')
  if (context.coverage.status === 'missing' && ['partial', 'complete'].includes(plan.status)) issues.push('Missing paradigm knowledge cannot produce technical recommendations.')
  if (plan.status === 'partial' && !plan.gaps.length) issues.push('Partial plans must disclose missing evidence or requirements.')
  if (plan.status === 'clarification_required' && !plan.questions.length) issues.push('Clarification state must include questions.')
  if ((['unsupported', 'insufficient_evidence'].includes(plan.status) || plan.status === 'clarification_required' && (context.conflicts.length > 0 || context.coverage.status === 'missing' || context.coverage.status === 'incompatible')) && Object.values(populated).some(Boolean)) issues.push('Non-design states must defer technical recommendations.')
  const text = JSON.stringify(plan)
  if (/(?:achieved|measured|validated|guaranteed|expected)\s+(?:(?:classification|decoding)\s+)?(?:accuracy|performance)\s*(?:of|:|=|is)?\s*\d|\d+(?:\.\d+)?\s*%\s*(?:accuracy|accurate)/i.test(text)) issues.push('Unsupported performance result or prediction.')
  return [...new Set(issues)]
}
