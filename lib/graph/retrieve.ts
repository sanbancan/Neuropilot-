import type { DesignRequest } from '@/lib/schemas/design'
import { emptyRequirements, type TechnicalRequirements, type RetrievalStatus, type ScientificSource } from '@/lib/schemas/knowledge'
import { PARADIGM_INFO, type GraphSnapshot, type GraphSource, type GraphNode, type GraphEdge, type ParadigmContext, type RecognizedParadigm, type PlanningNode, type HardwareNode } from './types'

export interface RetrievalRequest {
  paradigm: RecognizedParadigm
  modality?: string
  hardware?: string
  requirements?: TechnicalRequirements
  conflicts?: string[]
  application?: DesignRequest['goal']
}
export const edgeId = (edge: GraphEdge) => edge.id || `${edge.fromKey}|${edge.type}|${edge.toKey}`

/** Hardware specifications must come from reviewed manufacturer records, not generic citations. */
export function hasReviewedHardwareSpecification(node: HardwareNode, sources: ScientificSource[]): boolean {
  return Boolean(node.sourceIds?.some(id => sources.some(source => source.id === id && source.kind === 'manufacturer_specification' && source.verification === 'reviewed')))
}

/** Same selection algorithm for database and offline snapshots; never synthesizes evidence. */
export function retrieveContext(snapshot: GraphSnapshot, request: RetrievalRequest, source: GraphSource = 'in-memory', retrieval: RetrievalStatus = { status: 'ok', reason: null }): ParadigmContext {
  const requirements = request.requirements || { ...emptyRequirements, electrodeSites: [] }
  const conflicts = [...(request.conflicts || [])]
  const nodes = new Map(snapshot.nodes.map(node => [node.key, node]))
  const root = nodes.get(request.paradigm)
  const modalities = snapshot.edges.filter(edge => edge.fromKey === request.paradigm && edge.type === 'USES_MODALITY').map(edge => nodes.get(edge.toKey)?.name).filter(Boolean)
  const requestedModality = request.modality && request.modality !== 'unknown' ? request.modality : null
  const incompatible = Boolean(root && requestedModality && !modalities.includes(requestedModality))
  const issues: string[] = []
  if (!root) issues.push('No paradigm knowledge was found in the selected catalog. Recognition is not evidence coverage.')
  if (incompatible) issues.push(`The retrieved paradigm supports ${modalities.join(', ') || 'no documented modality'}, not ${requestedModality}. No acquisition or decoding recommendations were retrieved.`)
  const reached = new Set<string>(root && !incompatible ? [root.key] : [])
  let frontier = [...reached]
  for (let depth = 0; depth < 5; depth++) {
    const next: string[] = []
    for (const edge of snapshot.edges) {
      if (!frontier.includes(edge.fromKey)) continue
      const node = nodes.get(edge.toKey)
      if (!node || node.label === 'Paradigm' || reached.has(node.key)) continue
      reached.add(node.key)
      next.push(node.key)
    }
    frontier = next
  }
  // Dataset relevance is explicitly incoming; never pull unrelated catalog datasets.
  for (const edge of snapshot.edges) {
    if (reached.has(request.paradigm) && edge.toKey === request.paradigm && edge.type === 'RELEVANT_TO' && nodes.get(edge.fromKey)?.label === 'Dataset') reached.add(edge.fromKey)
  }
  let selected = snapshot.nodes.filter(node => reached.has(node.key))
  const hardware = selected.filter((node): node is Extract<GraphNode, { label: 'Hardware' }> => node.label === 'Hardware')
  let matches = hardware
  if (request.hardware && !/no hardware|don.t have|not have|not yet|none/i.test(request.hardware)) {
    const text = request.hardware.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    const scored = hardware.map(node => ({ node, score: Math.max(0, ...[node.name, ...(node.aliases || [])].map(alias => {
      const normalized = alias.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      return normalized && ` ${text} `.includes(` ${normalized} `) ? normalized.length : 0
    })) }))
    const best = Math.max(0, ...scored.map(item => item.score))
    matches = best ? scored.filter(item => item.score === best).map(item => item.node) : []
    if (!matches.length) issues.push('The specified hardware has no matching verified catalog configuration. Its specifications must be supplied or verified.')
  }
  const permittedHardware = matches.filter(node => {
    if (node.modality && requestedModality && node.modality !== requestedModality) return false
    if (requirements.requiredChannels && node.channels && requirements.requiredChannels > node.channels) {
      if (request.hardware) conflicts.push(`${node.name} has ${node.channels} documented channels, fewer than the required ${requirements.requiredChannels}.`)
      return false
    }
    if (node.channels && requirements.electrodeSites.length > node.channels) {
      if (request.hardware) conflicts.push(`${node.name} cannot record the requested ${requirements.electrodeSites.length} electrode sites with ${node.channels} channels.`)
      return false
    }
    if (requirements.samplingRateHz && node.samplingRateHz && requirements.samplingRateHz !== node.samplingRateHz) {
      if (request.hardware) conflicts.push(`${node.name} standard mode is ${node.samplingRateHz} Hz; requested ${requirements.samplingRateHz} Hz is not documented.`)
      return false
    }
    return true
  })
  const allowedHardware = new Set(permittedHardware.map(node => node.key))
  selected = selected.filter(node => node.label !== 'Hardware' || allowedHardware.has(node.key))
  if (requirements.electrodeSites.length) {
    selected = selected.filter(node => node.label !== 'Electrode' || requirements.electrodeSites.some(site => site.toLowerCase() === node.name.toLowerCase()))
    for (const site of requirements.electrodeSites) {
      if (!selected.some(node => node.label === 'Electrode' && node.name.toLowerCase() === site.toLowerCase())) issues.push(`Electrode ${site} is not supported by retrieved montage relationships.`)
    }
  }
  selected = selected.filter(node => node.label !== 'Deployment' || Boolean(requirements.deploymentTarget && node.targets?.some(target => target.toLowerCase() === requirements.deploymentTarget!.toLowerCase())))
  const selectedKeys = new Set(selected.map(node => node.key))
  const usedEdges = snapshot.edges.filter(edge => selectedKeys.has(edge.fromKey) && selectedKeys.has(edge.toKey))
    .map(edge => ({ ...edge, id: edgeId(edge), sourceIds: [...(edge.sourceIds || [])] }))
    .sort((a, b) => a.id.localeCompare(b.id))
  const sourceIds = new Set([...usedEdges.flatMap(edge => edge.sourceIds), ...selected.flatMap(node => node.sourceIds || [])])
  const sources = snapshot.sources.filter(item => sourceIds.has(item.id)).sort((a, b) => a.id.localeCompare(b.id))
  const reviewed = new Set(sources.filter(item => item.verification === 'reviewed' && item.kind !== 'curated_entry').map(item => item.id))
  const reviewedEdges = usedEdges.filter(edge => edge.verification === 'reviewed' && edge.sourceIds.length && edge.sourceIds.every(id => reviewed.has(id)))
  // A declared reviewed flag is never enough when source records are absent/unreviewed.
  const reviewedIds = new Set(reviewedEdges.map(edge => edge.id))
  const relationships = usedEdges.map(edge => ({ ...edge, verification: reviewedIds.has(edge.id) ? 'reviewed' as const : 'unverified' as const }))
  const byLabel = <L extends GraphNode['label']>(label: L): Extract<GraphNode, { label: L }>[] => selected
    .filter(node => node.label === label)
    .sort((a, b) => ('stage' in a ? a.stage || 0 : 0) - ('stage' in b ? b.stage || 0 : 0) || a.key.localeCompare(b.key)) as Extract<GraphNode, { label: L }>[]
  const hasReviewed = (label: GraphNode['label']) => selected.some(node => node.label === label && (node.label !== 'Hardware' || hasReviewedHardwareSpecification(node, sources)) && reviewedEdges.some(edge => (edge.toKey === node.key || edge.fromKey === node.key) && (label !== 'Modality' || edge.fromKey === request.paradigm && edge.type === 'USES_MODALITY')))
  const sectionLabels: [string, GraphNode['label']][] = [
    ['modality', 'Modality'], ['neuralTarget', 'NeuralSignal'], ['electrodes', 'Electrode'],
    ['hardware', 'Hardware'], ['pipeline', 'ProcessingMethod'], ['features', 'Feature'],
    ['protocol', 'Protocol'], ['validation', 'ValidationMethod'], ['deployment', 'Deployment'],
  ]
  if (request.paradigm !== 'meditation-alpha') sectionLabels.push(['classifier', 'Classifier'])
  const missingSections = sectionLabels.filter(([, label]) => !hasReviewed(label)).map(([section]) => section)
  if (!permittedHardware.some(node => node.samplingRateHz && hasReviewedHardwareSpecification(node, sources))) missingSections.push('sampling')
  if (!requirements.deploymentTarget) { missingSections.push('deployment requirements'); issues.push('Deployment target has not been specified.') }
  const coverage = {
    status: incompatible ? 'incompatible' as const : !root ? 'missing' as const : missingSections.length || conflicts.length ? 'partial' as const : 'sufficient' as const,
    missingSections, provisionalSections: sectionLabels.filter(([section, label]) => missingSections.includes(section) && selected.some(node => node.label === label && relationships.some(edge => (edge.fromKey === node.key || edge.toKey === node.key) && edge.sourceIds.some(id => sources.some(source => source.id === id))))).map(([section]) => section), issues, reviewedRelationships: reviewedEdges.length,
    unverifiedRelationships: relationships.length - reviewedEdges.length,
  }
  const name = request.paradigm === 'other' ? 'Other BCI objective' : request.paradigm === 'unknown' ? 'Unresolved BCI objective' : PARADIGM_INFO[request.paradigm].name
  return {
    paradigmKey: request.paradigm, paradigmName: root?.name || name, source,
    modality: requestedModality || String(modalities[0] || 'unknown'),
    signals: byLabel('NeuralSignal'), frequencyBands: byLabel('FrequencyBand'), brainRegions: byLabel('BrainRegion'),
    electrodes: byLabel('Electrode'), hardware: byLabel('Hardware'), processingMethods: byLabel('ProcessingMethod'),
    features: byLabel('Feature'), classifiers: byLabel('Classifier'), artifacts: byLabel('Artifact'), confounds: byLabel('Confound'),
    validationMethods: byLabel('ValidationMethod'), datasets: byLabel('Dataset'),
    protocols: selected.filter((node): node is PlanningNode => node.label === 'Protocol'), deployments: selected.filter((node): node is PlanningNode => node.label === 'Deployment'),
    relationships, sources, requirements, conflicts: [...new Set(conflicts)], coverage,
    retrieval: !root ? { ...retrieval, status: retrieval.status === 'fallback' ? 'fallback' : 'empty' } : retrieval,
    reasoningPath: relationships.map(edge => ({
      relationshipId: edge.id, from: nodes.get(edge.fromKey)!.name, relationship: edge.type, to: nodes.get(edge.toKey)!.name,
      evidence: edge.evidence, note: edge.note, sourceIds: edge.sourceIds, verification: edge.verification,
    })),
  }
}
