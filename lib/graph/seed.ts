/** Additive, scoped seeding. Caller supplies a transaction; no database access on import. */
import { SEED_GRAPH } from './seed-data'
import { CATALOG_ID } from './queries'
import type { GraphSnapshot } from './types'

export interface CatalogTransaction { run(query: string, params: Record<string, unknown>): Promise<unknown> }
const LABELS = new Set(['Paradigm', 'Modality', 'NeuralSignal', 'FrequencyBand', 'BrainRegion', 'Electrode', 'Hardware', 'ProcessingMethod', 'Feature', 'Classifier', 'Artifact', 'Confound', 'ValidationMethod', 'Dataset', 'Protocol', 'Deployment'])
const RELATIONSHIPS = new Set(['USES_MODALITY', 'HAS_MODALITY', 'ASSOCIATED_WITH', 'MEASURED_OVER', 'MEASURED_AT', 'HAS_FREQUENCY', 'PROCESSED_BY', 'EXTRACTED_BY', 'CLASSIFIED_BY', 'CONTAMINATED_BY', 'CONFOUNDED_BY', 'VALIDATED_BY', 'REQUIRES', 'COMPATIBLE_WITH', 'HAS_DATASET', 'RELEVANT_TO', 'INVESTIGATES', 'AFFECTS'])

export async function seedCatalog(tx: CatalogTransaction, snapshot: GraphSnapshot = SEED_GRAPH) {
  // Validate every interpolated identifier before the first write.
  if (snapshot.nodes.some(node => !LABELS.has(node.label)) || snapshot.edges.some(edge => !RELATIONSHIPS.has(edge.type))) throw new Error('Unknown catalog identifier')
  for (const node of snapshot.nodes) {
    const props = Object.fromEntries(Object.entries(node).filter(([key, value]) => key !== 'catalogId' && value !== undefined && value !== null))
    await tx.run(`MERGE (n:NeuroPilotKnowledge:${node.label} {catalogId: $catalogId, key: $key}) SET n += $props`, { catalogId: CATALOG_ID, key: node.key, props })
  }
  for (const source of snapshot.sources) {
    await tx.run('MERGE (s:NeuroPilotSource {catalogId: $catalogId, key: $key}) SET s.data = $data', { catalogId: CATALOG_ID, key: source.id, data: JSON.stringify(source) })
  }
  for (const edge of snapshot.edges) {
    const id = edge.id || `${edge.fromKey}|${edge.type}|${edge.toKey}`
    const props = Object.fromEntries(Object.entries(edge).filter(([key, value]) => key !== 'catalogId' && value !== undefined && value !== null))
    await tx.run(`MATCH (a:NeuroPilotKnowledge {catalogId: $catalogId, key: $from}), (b:NeuroPilotKnowledge {catalogId: $catalogId, key: $to}) MERGE (a)-[r:${edge.type} {catalogId: $catalogId, id: $id}]->(b) SET r += $props`, {
      catalogId: CATALOG_ID, from: edge.fromKey, to: edge.toKey, id, props,
    })
  }
}
