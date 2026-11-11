import { buildFallbackPlan } from '@/lib/ai/fallback'
import { prototypePlanSchema, type DesignResponse } from '@/lib/schemas/design'
import type { GraphSnapshot } from '@/lib/graph/types'
import { retrieveContext } from '@/lib/graph/retrieve'
import { emptyRequirements } from '@/lib/schemas/knowledge'

/** Entirely synthetic reviewed catalog for contract tests; not real scientific evidence. */
export const fixtureGraph: GraphSnapshot = {
  sources: [{ id: 'fixture:reviewed', kind: 'publication', title: 'Synthetic test-only source', authors: [], year: null, doi: null, url: null, venue: null, verification: 'reviewed', reviewedAt: '2026-11-06', scope: 'Test-only records, never production evidence.' }],
  nodes: [
    { key: 'motor-imagery', name: 'Motor Imagery', label: 'Paradigm', paradigmKey: 'motor-imagery' },
    { key: 'eeg', name: 'EEG', label: 'Modality' },
    { key: 'signal', name: 'Fixture signal', label: 'NeuralSignal' },
    { key: 'region', name: 'Fixture region', label: 'BrainRegion' },
    ...['C3', 'Cz', 'C4', 'Pz'].map(name => ({ key: name, name, label: 'Electrode' as const })),
    { key: 'hardware', name: 'Fixture device', label: 'Hardware', channels: 8, samplingRateHz: 250, modality: 'EEG', sourceIds: ['fixture:manufacturer'] },
    { key: 'method', name: 'Fixture method', label: 'ProcessingMethod', stage: 1 },
    { key: 'feature', name: 'Fixture feature', label: 'Feature' },
    { key: 'classifier', name: 'Fixture decoder', label: 'Classifier' },
    { key: 'protocol', name: 'Unique protocol step', description: 'Unique protocol detail, proposed only.', label: 'Protocol' },
    { key: 'evaluation', name: 'Fixture evaluation', description: 'Independent held-out evaluation proposed.', label: 'ValidationMethod' },
    { key: 'deployment', name: 'Fixture deployment', label: 'Deployment', targets: ['desktop'] },
  ],
  edges: [],
}
fixtureGraph.sources.push({ ...fixtureGraph.sources[0], id: 'fixture:manufacturer', kind: 'manufacturer_specification', title: 'Synthetic test-only hardware specification' })
fixtureGraph.edges = fixtureGraph.nodes.filter(node => node.key !== 'motor-imagery').map(node => ({
  id: `fixture:${node.key}`, fromKey: 'motor-imagery', toKey: node.key,
  type: node.label === 'Modality' ? 'USES_MODALITY' : 'ASSOCIATED_WITH',
  sourceIds: [node.label === 'Hardware' ? 'fixture:manufacturer' : 'fixture:reviewed'], verification: 'reviewed', evidence: 'engineering-default',
}))
export const context = retrieveContext(fixtureGraph, {
  paradigm: 'motor-imagery', modality: 'EEG', requirements: { ...emptyRequirements, electrodeSites: [], deploymentTarget: 'desktop' },
})
export const input = { goal: 'Explore motor imagery with my existing hardware.', modality: 'EEG', context }
export const fixtureInterpretation = { summary: input.goal, paradigm: 'motor-imagery' as const, candidates: ['motor-imagery' as const], modality: 'EEG' as const, questions: [] }

export function validPlan() {
  const plan = buildFallbackPlan(input)
  return prototypePlanSchema.parse(JSON.parse(JSON.stringify({
    ...plan,
    title: 'Unique model design', summary: 'Full model summary. Important second sentence.',
    paradigm: { name: 'Motor Imagery', reason: 'Unique paradigm rationale.' },
    sampling: { rateHz: 250, recommendation: '250 Hz', reason: 'Unique sampling rationale.' },
    nextActions: [{ action: 'Check the device specification before recording.', rationale: 'Unique action rationale.' }],
    assumptions: ['Unique model assumption.'], limitations: ['Unique model limitation.'],
    hardware: { deviceKey: 'hardware', requirements: ['Unique hardware requirement.'], reason: 'Unique hardware rationale.' },
    confounds: Array.from({ length: 7 }, (_, i) => ({ name: `Confound ${i}`, detail: `Full confound ${i} detail.` })),
  })))
}
export function validResponse(): DesignResponse {
  return {
    plan: validPlan(),
    meta: {
      paradigmKey: 'motor-imagery', graphSource: 'in-memory', generator: 'llm', model: 'mock-model',
      generatedAt: '2026-11-06T12:00:00.000Z', attempts: 1, fallbackReason: null,
      interpretation: fixtureInterpretation, interpretationAttempts: 1, interpretationMethod: 'model', interpretationFailure: null,
      coverage: context.coverage, retrieval: context.retrieval, sources: context.sources,
    },
  }
}
