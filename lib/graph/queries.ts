/** Read a bounded catalog snapshot, then apply the same pure retrieval policy offline/live. */
import { isInt } from 'neo4j-driver'
import { getNeo4jDriver } from '@/lib/neo4j'
import { scientificSourceSchema } from '@/lib/schemas/knowledge'
import { SEED_GRAPH } from './seed-data'
import { retrieveContext, type RetrievalRequest } from './retrieve'
import type { GraphSnapshot, GraphNode, GraphEdge, RecognizedParadigm } from './types'

export const CATALOG_ID = 'neuropilot-science-v2'
export interface GraphReader {
  executeQuery(query: string, params: Record<string, unknown>): Promise<{ records: { get(key: string): unknown }[] }>
}
export const SNAPSHOT_QUERIES = {
  nodes: 'MATCH (n:NeuroPilotKnowledge {catalogId: $catalogId}) RETURN properties(n) AS data ORDER BY n.key LIMIT 2001',
  edges: 'MATCH (a:NeuroPilotKnowledge {catalogId: $catalogId})-[r]->(b:NeuroPilotKnowledge {catalogId: $catalogId}) WHERE r.catalogId = $catalogId RETURN properties(r) AS data, a.key AS fromKey, b.key AS toKey, type(r) AS relationship ORDER BY r.id LIMIT 10001',
  sources: 'MATCH (s:NeuroPilotSource {catalogId: $catalogId}) RETURN s.data AS data ORDER BY s.key LIMIT 2001',
}
function native(value: unknown): unknown {
  if (isInt(value)) return value.toNumber()
  if (Array.isArray(value)) return value.map(native)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, native(item)]))
  return value
}
export async function readGraphSnapshot(driver: GraphReader): Promise<GraphSnapshot> {
  const params = { catalogId: CATALOG_ID }
  const nodeResult = await driver.executeQuery(SNAPSHOT_QUERIES.nodes, params)
  const edgeResult = await driver.executeQuery(SNAPSHOT_QUERIES.edges, params)
  const sourceResult = await driver.executeQuery(SNAPSHOT_QUERIES.sources, params)
  if (nodeResult.records.length > 2000 || edgeResult.records.length > 10000 || sourceResult.records.length > 2000) throw new Error('Catalog exceeds bounded retrieval size')
  const nodes = nodeResult.records.map(record => native(record.get('data')) as GraphNode)
  if (nodes.some(node => !node || typeof node.key !== 'string' || typeof node.name !== 'string' || typeof node.label !== 'string')) throw new Error('Invalid catalog node')
  const edges = edgeResult.records.map(record => ({
    ...native(record.get('data')) as GraphEdge,
    fromKey: record.get('fromKey') as string, toKey: record.get('toKey') as string, type: record.get('relationship') as GraphEdge['type'],
  }))
  const sources = sourceResult.records.map(record => scientificSourceSchema.parse(JSON.parse(String(record.get('data')))))
  return { nodes, edges, sources }
}
export async function getParadigmContext(
  paradigm: RecognizedParadigm,
  options: Omit<RetrievalRequest, 'paradigm'> = {},
  driver: GraphReader | null = getNeo4jDriver(),
) {
  const request = { ...options, paradigm }
  if (driver) {
    try {
      // A successfully queried empty catalog stays empty; seed data must not conceal missing evidence.
      return retrieveContext(await readGraphSnapshot(driver), request, 'neo4j')
    } catch {
      return retrieveContext(SEED_GRAPH, request, 'in-memory', { status: 'fallback', reason: 'database_unavailable' })
    }
  }
  return retrieveContext(SEED_GRAPH, request, 'in-memory', { status: 'fallback', reason: 'not_configured' })
}
