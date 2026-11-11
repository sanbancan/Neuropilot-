import assert from 'node:assert/strict'
import { test } from 'node:test'
import { int } from 'neo4j-driver'
import { SEED_GRAPH } from '@/lib/graph/seed-data'
import { retrieveContext } from '@/lib/graph/retrieve'
import { getParadigmContext, readGraphSnapshot, CATALOG_ID, SNAPSHOT_QUERIES, type GraphReader } from '@/lib/graph/queries'
import { resolveRequirements } from '@/lib/graph/requirements'
import { emptyRequirements } from '@/lib/schemas/knowledge'
import type { GraphSnapshot } from '@/lib/graph/types'

export function graphReader(snapshot: GraphSnapshot): GraphReader {
  return { async executeQuery(query, params) {
    assert.equal(params.catalogId, CATALOG_ID)
    const rows = query === SNAPSHOT_QUERIES.nodes ? snapshot.nodes.map(data => ({ data }))
      : query === SNAPSHOT_QUERIES.edges ? snapshot.edges.map(edge => ({ data: edge, fromKey: edge.fromKey, toKey: edge.toKey, relationship: edge.type }))
      : query === SNAPSHOT_QUERIES.sources ? snapshot.sources.map(source => ({ data: JSON.stringify(source) })) : assert.fail('Unexpected query')
    return { records: rows.map(row => ({ get: (key: string) => (row as Record<string, unknown>)[key] })) }
  } }
}

for (const paradigm of ['motor-imagery', 'ssvep', 'meditation-alpha', 'p300'] as const) {
  test(`Neo4j decoding and offline retrieval agree for ${paradigm}`, async () => {
    const live = await getParadigmContext(paradigm, {}, graphReader(SEED_GRAPH))
    const offline = retrieveContext(SEED_GRAPH, { paradigm })
    assert.deepEqual({ ...live, source: 'in-memory' }, offline)
    for (const hop of live.reasoningPath) {
      assert.ok(live.relationships.some(edge => edge.id === hop.relationshipId))
      assert.ok(hop.sourceIds?.every(id => live.sources.some(source => source.id === id)))
    }
  })
}

test('meditation retrieves indirect processing and posterior electrodes with confound relationships', () => {
  const result = retrieveContext(SEED_GRAPH, { paradigm: 'meditation-alpha' })
  assert.ok(result.processingMethods.some(node => node.key === 'psd'))
  assert.ok(result.processingMethods.some(node => node.key === 'bandpower'))
  assert.ok(result.electrodes.some(node => node.name === 'Pz'))
  assert.ok(result.relationships.some(edge => edge.type === 'AFFECTS' && edge.fromKey === 'eye-closure'))
  assert.equal(result.coverage.status, 'partial')
  assert.ok(result.coverage.unverifiedRelationships > 0)
})

test('P300 recognition does not synthesize SSVEP evidence', () => {
  const result = retrieveContext(SEED_GRAPH, { paradigm: 'p300' })
  assert.equal(result.coverage.status, 'missing')
  assert.equal(result.retrieval.status, 'empty')
  assert.deepEqual(result.classifiers, [])
  assert.deepEqual(result.reasoningPath, [])
})

test('fNIRS-only requests cannot retrieve EEG electrodes, classifiers, or hardware', () => {
  const result = retrieveContext(SEED_GRAPH, { paradigm: 'motor-imagery', modality: 'fNIRS', hardware: 'Cyton' })
  assert.equal(result.coverage.status, 'incompatible')
  assert.equal(result.modality, 'fNIRS')
  assert.deepEqual(result.electrodes, [])
  assert.deepEqual(result.hardware, [])
  assert.deepEqual(result.classifiers, [])
})

test('explicit manufacturer configuration chooses Daisy instead of standalone Cyton', () => {
  const result = retrieveContext(SEED_GRAPH, { paradigm: 'motor-imagery', hardware: 'OpenBCI Cyton + Daisy' })
  assert.deepEqual(result.hardware.map(node => node.key), ['openbci-cyton-daisy'])
  assert.equal(result.hardware[0].samplingRateHz, 125)
  assert.equal(result.hardware[0].channels, 16)
  assert.ok(result.sources.some(source => source.kind === 'manufacturer_specification'))
})

test('unknown hardware remains unresolved, without fabricated specifications', () => {
  const result = retrieveContext(SEED_GRAPH, { paradigm: 'motor-imagery', hardware: 'A custom mystery headset' })
  assert.deepEqual(result.hardware, [])
  assert.ok(result.coverage.missingSections.includes('hardware'))
  assert.ok(result.coverage.issues.some(issue => issue.includes('no matching')))
})

test('hardware channel and sampling requirements filter incompatible configurations', () => {
  const requirements = { ...emptyRequirements, electrodeSites: [], requiredChannels: 16, samplingRateHz: 500 }
  const result = retrieveContext(SEED_GRAPH, { paradigm: 'motor-imagery', hardware: 'Cyton', requirements })
  assert.deepEqual(result.hardware, [])
  assert.ok(result.conflicts.some(issue => issue.includes('channels')))
  const rate = retrieveContext(SEED_GRAPH, { paradigm: 'motor-imagery', hardware: 'Cyton', requirements: { ...requirements, requiredChannels: null } })
  assert.ok(rate.conflicts.some(issue => issue.includes('250 Hz')))
})

test('explicit user constraints remain deterministic and detect conflicting channel counts', () => {
  const resolved = resolveRequirements({ goal: 'Build a motor imagery EEG BCI.', constraints: 'I only have 2 channels but need 8 channels. Sample at 500 Hz.', requirements: undefined })
  assert.equal(resolved.requirements.availableChannels, 2)
  assert.equal(resolved.requirements.requiredChannels, 8)
  assert.equal(resolved.requirements.samplingRateHz, 500)
  assert.ok(resolved.conflicts.length)
})

test('successful empty Neo4j query stays missing instead of borrowing seed evidence', async () => {
  const result = await getParadigmContext('motor-imagery', {}, graphReader({ nodes: [], edges: [], sources: [] }))
  assert.equal(result.source, 'neo4j')
  assert.equal(result.coverage.status, 'missing')
  assert.equal(result.retrieval.status, 'empty')
  assert.deepEqual(result.sources, [])
})

test('database errors use a disclosed offline fallback', async () => {
  const result = await getParadigmContext('motor-imagery', {}, { executeQuery: async () => { throw new Error('private database details') } })
  assert.equal(result.source, 'in-memory')
  assert.equal(result.retrieval.reason, 'database_unavailable')
  assert.doesNotMatch(JSON.stringify(result), /private database/)
})

test('missing source metadata downgrades a claimed reviewed relationship', () => {
  const result = retrieveContext({ ...SEED_GRAPH, sources: [] }, { paradigm: 'ssvep' })
  assert.equal(result.coverage.reviewedRelationships, 0)
  assert.ok(result.reasoningPath.every(step => step.verification === 'unverified'))
})

test('Neo4j integer fields normalize into application numbers', async () => {
  const reader = graphReader(SEED_GRAPH)
  const execute = reader.executeQuery.bind(reader)
  reader.executeQuery = async (query, params) => {
    const response = await execute(query, params)
    if (query === SNAPSHOT_QUERIES.nodes) return { records: response.records.map(record => ({ get: () => ({ ...(record.get('data') as object), stage: int(2) }) })) }
    return response
  }
  const graph = await readGraphSnapshot(reader)
  assert.equal((graph.nodes[0] as unknown as { stage: number }).stage, 2)
})

test('worded channel counts and structured constraints are reconciled conservatively', () => {
  const resolved = resolveRequirements({ goal: 'Build motor imagery EEG.', constraints: 'I only have two channels but need eight channels.', requirements: { availableChannels: 4 } })
  assert.equal(resolved.requirements.requiredChannels, 8)
  assert.ok(resolved.conflicts.some(issue => issue.includes('availableChannels')))
})

test('deployment retrieval excludes designs for a different application target', () => {
  const graph: GraphSnapshot = {
    nodes: [...SEED_GRAPH.nodes, { key: 'desktop-app', label: 'Deployment', name: 'Desktop-only deployment', targets: ['desktop'] }],
    edges: [...SEED_GRAPH.edges, { id: 'deployment-fixture', fromKey: 'motor-imagery', toKey: 'desktop-app', type: 'REQUIRES', verification: 'unverified', sourceIds: ['curated:legacy-v1'] }],
    sources: SEED_GRAPH.sources,
  }
  const mobile = retrieveContext(graph, { paradigm: 'motor-imagery', requirements: { ...emptyRequirements, electrodeSites: [], deploymentTarget: 'mobile' } })
  assert.deepEqual(mobile.deployments, [])
  const desktop = retrieveContext(graph, { paradigm: 'motor-imagery', requirements: { ...emptyRequirements, electrodeSites: [], deploymentTarget: 'desktop' } })
  assert.equal(desktop.deployments[0].key, 'desktop-app')
})

test('sampling units normalize conservatively and out-of-bounds constraints require clarification', () => {
  const result = resolveRequirements({ goal: 'Build motor imagery EEG.', constraints: 'Sample at 1 kHz.' })
  assert.equal(result.requirements.samplingRateHz, 1000)
  const invalid = resolveRequirements({ goal: 'Build motor imagery EEG.', constraints: 'I only have 0 channels.' })
  assert.ok(invalid.conflicts.some(issue => issue.includes('bounds')))
})
