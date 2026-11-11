import assert from 'node:assert/strict'
import { test } from 'node:test'
import { seedCatalog } from '@/lib/graph/seed'
import { SEED_GRAPH } from '@/lib/graph/seed-data'
import { CATALOG_ID } from '@/lib/graph/queries'

/** Fake transactional store models the scope and idempotency of the emitted MERGE statements. */
test('seeding twice preserves unrelated records and does not duplicate catalog entities', async () => {
  const nodes = new Map<string, unknown>([
    ['other-project:session', { privateProject: true }],
    ['legacy:motor-imagery', { legacy: true }],
  ])
  const edges = new Map<string, unknown>([['other-project:edge', { unrelated: true }]])
  const statements: string[] = []
  const tx = { async run(query: string, params: Record<string, unknown>) {
    statements.push(query)
    assert.doesNotMatch(query, /\bDELETE\b|\bDROP\b|\bREMOVE\b|\bCREATE\s*\(/i)
    assert.equal(params.catalogId, CATALOG_ID)
    assert.match(query, /catalogId: \$catalogId/)
    if (query.includes('MERGE (n:NeuroPilotKnowledge:')) nodes.set(`${params.catalogId}:${params.key}`, params.props)
    else if (query.includes('MERGE (s:NeuroPilotSource')) nodes.set(`${params.catalogId}:source:${params.key}`, params.data)
    else if (query.includes('MERGE (a)-[r:')) edges.set(`${params.catalogId}:${params.id}`, params.props)
    else assert.fail('Unexpected mutation')
  } }
  await seedCatalog(tx)
  const firstNodes = new Map(nodes), firstEdges = new Map(edges)
  await seedCatalog(tx)
  assert.deepEqual(nodes, firstNodes)
  assert.deepEqual(edges, firstEdges)
  assert.deepEqual(nodes.get('other-project:session'), { privateProject: true })
  assert.deepEqual(nodes.get('legacy:motor-imagery'), { legacy: true })
  assert.deepEqual(edges.get('other-project:edge'), { unrelated: true })
  assert.equal(nodes.size, SEED_GRAPH.nodes.length + SEED_GRAPH.sources.length + 2)
  assert.equal(edges.size, SEED_GRAPH.edges.length + 1)
  assert.ok(statements.every(query => query.includes('NeuroPilotKnowledge') || query.includes('NeuroPilotSource')))
})

test('invalid interpolated database identifiers reject before any writes', async () => {
  let calls = 0
  await assert.rejects(seedCatalog({ run: async () => { calls++; return {} } }, {
    ...SEED_GRAPH,
    edges: [{ fromKey: 'a', toKey: 'b', type: 'INVALID_DELETE' as never }],
  }))
  assert.equal(calls, 0)
})

test('seed provenance never retroactively verifies legacy assertions', () => {
  const sources = new Map(SEED_GRAPH.sources.map(source => [source.id, source]))
  assert.equal(sources.get('curated:legacy-v1')?.verification, 'unverified')
  for (const edge of SEED_GRAPH.edges) {
    assert.ok(edge.id)
    assert.ok(edge.sourceIds?.length)
    for (const id of edge.sourceIds!) assert.ok(sources.has(id), id)
    if (edge.verification === 'reviewed') assert.ok(edge.sourceIds!.every(id => sources.get(id)?.verification === 'reviewed' && sources.get(id)?.kind !== 'curated_entry'))
  }
  const montage = SEED_GRAPH.edges.find(edge => edge.toKey === 'c3')!
  assert.equal(montage.verification, 'unverified')
  assert.deepEqual(montage.sourceIds, ['curated:legacy-v1'])
})
