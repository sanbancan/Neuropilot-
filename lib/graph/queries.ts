/**
 * Knowledge-graph query layer.
 *
 * Exposes `getParadigmContext()` — the single retrieval function consumed
 * by the agent / API layer.  When Neo4j is configured and reachable the
 * function queries the live graph; otherwise it falls back to an in-memory
 * mirror built from the canonical seed data.
 *
 * Both code paths produce **identical** `ParadigmContext` objects so that
 * consuming code never needs to know which backend served the result.
 */

import { isInt } from 'neo4j-driver'
import type { Record as Neo4jRecord } from 'neo4j-driver'

import { getNeo4jDriver } from '@/lib/neo4j'
import {
  PARADIGM_INFO,
  type ArtifactNode,
  type BrainRegionNode,
  type ClassifierNode,
  type ConfoundNode,
  type DatasetNode,
  type ElectrodeNode,
  type FeatureNode,
  type FrequencyBandNode,
  type GraphNodeBase,
  type GraphSource,
  type HardwareNode,
  type ModalityNode,
  type NeuralSignalNode,
  type ParadigmContext,
  type ParadigmKey,
  type ParadigmNode,
  type ProcessingMethodNode,
  type ValidationMethodNode,
} from '@/lib/graph/types'
import {
  ALL_EDGES,
  ALL_NODES,
  REASONING_PATHS,
} from '@/lib/graph/seed-data'

// ═══════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Retrieve the full structured knowledge for one BCI paradigm.
 *
 * Tries Neo4j first; falls back to the in-memory seed mirror on error
 * or when credentials are not configured.
 */
export async function getParadigmContext(
  paradigm: ParadigmKey,
): Promise<ParadigmContext> {
  const driver = getNeo4jDriver()

  if (driver) {
    try {
      return await getNeo4jContext(driver, paradigm)
    } catch {
      // Fall through to in-memory fallback
    }
  }

  return getInMemoryContext(paradigm)
}

// ═══════════════════════════════════════════════════════════════════════════
// In-memory fallback
// ═══════════════════════════════════════════════════════════════════════════

function getInMemoryContext(paradigm: ParadigmKey): ParadigmContext {
  // Discover every node reachable forward from the paradigm via seed edges
  // (up to 5 hops — enough for meditation-alpha: paradigm → signal → signal
  // → region → electrode).  Forward-only traversal prevents cross-paradigm
  // contamination through shared nodes like "EEG".
  const reached = new Set<string>([paradigm])
  const queue: Array<{ key: string; depth: number }> = [
    { key: paradigm, depth: 0 },
  ]

  while (queue.length > 0) {
    const { key, depth } = queue.shift()!
    if (depth >= 5) continue

    for (const edge of ALL_EDGES) {
      if (edge.fromKey === key && !reached.has(edge.toKey)) {
        reached.add(edge.toKey)
        queue.push({ key: edge.toKey, depth: depth + 1 })
      }
    }
  }

  // Also include any Dataset that explicitly links TO this paradigm
  for (const edge of ALL_EDGES) {
    if (edge.toKey === paradigm && edge.type === 'RELEVANT_TO') {
      reached.add(edge.fromKey)
    }
  }

  // ── Filter seed nodes by reached keys ──────────────────────────────────

  const filter = <T extends GraphNodeBase>(nodes: T[], label: string): T[] =>
    nodes.filter(
      (n) => reached.has(n.key) && (n as unknown as { label: string }).label === label,
    )

  const paradigmNode = ALL_NODES.find(
    (n): n is ParadigmNode =>
      n.key === paradigm && (n as { label: string }).label === 'Paradigm',
  )

  const info = PARADIGM_INFO[paradigm]
  const modalityNode = filter(
    ALL_NODES.filter((n): n is ModalityNode => (n as { label: string }).label === 'Modality'),
    'Modality',
  )[0]

  return {
    paradigmKey: paradigm,
    paradigmName: paradigmNode?.name ?? info.name,
    source: 'in-memory' satisfies GraphSource,
    modality: modalityNode?.name ?? 'EEG',
    signals: filter(
      ALL_NODES.filter((n): n is NeuralSignalNode => (n as { label: string }).label === 'NeuralSignal'),
      'NeuralSignal',
    ),
    frequencyBands: filter(
      ALL_NODES.filter((n): n is FrequencyBandNode => (n as { label: string }).label === 'FrequencyBand'),
      'FrequencyBand',
    ),
    brainRegions: filter(
      ALL_NODES.filter((n): n is BrainRegionNode => (n as { label: string }).label === 'BrainRegion'),
      'BrainRegion',
    ),
    electrodes: filter(
      ALL_NODES.filter((n): n is ElectrodeNode => (n as { label: string }).label === 'Electrode'),
      'Electrode',
    ),
    hardware: filter(
      ALL_NODES.filter((n): n is HardwareNode => (n as { label: string }).label === 'Hardware'),
      'Hardware',
    ),
    processingMethods: filter(
      ALL_NODES.filter((n): n is ProcessingMethodNode => (n as { label: string }).label === 'ProcessingMethod'),
      'ProcessingMethod',
    ),
    features: filter(
      ALL_NODES.filter((n): n is FeatureNode => (n as { label: string }).label === 'Feature'),
      'Feature',
    ),
    classifiers: filter(
      ALL_NODES.filter((n): n is ClassifierNode => (n as { label: string }).label === 'Classifier'),
      'Classifier',
    ),
    artifacts: filter(
      ALL_NODES.filter((n): n is ArtifactNode => (n as { label: string }).label === 'Artifact'),
      'Artifact',
    ),
    confounds: filter(
      ALL_NODES.filter((n): n is ConfoundNode => (n as { label: string }).label === 'Confound'),
      'Confound',
    ),
    validationMethods: filter(
      ALL_NODES.filter((n): n is ValidationMethodNode => (n as { label: string }).label === 'ValidationMethod'),
      'ValidationMethod',
    ),
    datasets: filter(
      ALL_NODES.filter((n): n is DatasetNode => (n as { label: string }).label === 'Dataset'),
      'Dataset',
    ),
    reasoningPath: REASONING_PATHS[paradigm],
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Neo4j path
// ═══════════════════════════════════════════════════════════════════════════

// Neo4j property maps are untyped — we use `unknown` and narrow at the boundary.
type Neo4jProps = Record<string, unknown>

async function getNeo4jContext(
  driver: NonNullable<ReturnType<typeof getNeo4jDriver>>,
  paradigm: ParadigmKey,
): Promise<ParadigmContext> {
  const result = await driver.executeQuery(
    `
    MATCH (p:Paradigm {paradigmKey: $key})

    OPTIONAL MATCH (p)-[:USES_MODALITY]->(mod:Modality)

    OPTIONAL MATCH (p)-[:ASSOCIATED_WITH|INVESTIGATES]->(sig:NeuralSignal)

    OPTIONAL MATCH (p)-[:ASSOCIATED_WITH|INVESTIGATES]->(:NeuralSignal)-[:HAS_FREQUENCY]->(freq:FrequencyBand)

    OPTIONAL MATCH (p)-[:ASSOCIATED_WITH|INVESTIGATES]->(:NeuralSignal)-[:MEASURED_OVER]->(reg:BrainRegion)

    OPTIONAL MATCH (p)-[:ASSOCIATED_WITH|INVESTIGATES]->(:NeuralSignal)
             -[:MEASURED_OVER]->(:BrainRegion)-[:MEASURED_AT]->(elec:Electrode)

    OPTIONAL MATCH (p)-[:USES_MODALITY]->(:Modality)-[:REQUIRES]->(hw:Hardware)

    OPTIONAL MATCH (p)-[:PROCESSED_BY]->(proc:ProcessingMethod)

    OPTIONAL MATCH (p)-[:EXTRACTED_BY]->(feat:Feature)

    OPTIONAL MATCH (p)-[:CLASSIFIED_BY]->(clf:Classifier)

    OPTIONAL MATCH (p)-[:CONTAMINATED_BY]->(art:Artifact)

    OPTIONAL MATCH (p)-[:CONFOUNDED_BY]->(conf:Confound)

    OPTIONAL MATCH (p)-[:VALIDATED_BY]->(val:ValidationMethod)

    OPTIONAL MATCH (ds:Dataset)--(p)

    RETURN DISTINCT
      p    AS paradigm,
      mod  AS modality,
      sig  AS signal,
      freq AS frequencyBand,
      reg  AS brainRegion,
      elec AS electrode,
      hw   AS hardware,
      proc AS processingMethod,
      feat AS feature,
      clf  AS classifier,
      art  AS artifact,
      conf AS confound,
      val  AS validationMethod,
      ds   AS dataset
    `,
    { key: paradigm },
  )

  const collect = <T extends GraphNodeBase>(
    column: string,
  ): T[] => {
    const seen = new Set<string>()
    const nodes: T[] = []

    for (const record of result.records as Neo4jRecord[]) {
      const raw = record.get(column) as { properties?: Neo4jProps } | null
      if (!raw?.properties) continue
      const key = raw.properties.key as string | undefined
      if (!key || seen.has(key)) continue
      seen.add(key)
      nodes.push(toNode<T>(raw.properties))
    }

    return nodes
  }

  const paradigms = collect<ParadigmNode>('paradigm')
  const signals = collect<NeuralSignalNode>('signal')
  const frequencyBands = collect<FrequencyBandNode>('frequencyBand')
  const brainRegions = collect<BrainRegionNode>('brainRegion')
  const electrodes = collect<ElectrodeNode>('electrode')
  const hardware = collect<HardwareNode>('hardware')
  const processingMethods = collect<ProcessingMethodNode>('processingMethod')
  const features = collect<FeatureNode>('feature')
  const classifiers = collect<ClassifierNode>('classifier')
  const artifacts = collect<ArtifactNode>('artifact')
  const confounds = collect<ConfoundNode>('confound')
  const validationMethods = collect<ValidationMethodNode>('validationMethod')
  const datasets = collect<DatasetNode>('dataset')

  const modalityRecords = collect<ModalityNode>('modality')

  const info = PARADIGM_INFO[paradigm]
  const pNode = paradigms[0]

  return {
    paradigmKey: paradigm,
    paradigmName: pNode?.name ?? info.name,
    source: 'neo4j' satisfies GraphSource,
    modality: modalityRecords[0]?.name ?? 'EEG',
    signals,
    frequencyBands,
    brainRegions,
    electrodes,
    hardware,
    processingMethods,
    features,
    classifiers,
    artifacts,
    confounds,
    validationMethods,
    datasets,
    reasoningPath: REASONING_PATHS[paradigm],
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cast a Neo4j property map to a typed graph node.
 * Neo4j Integer values (e.g. frequency bounds) are converted to JS numbers.
 */
function toNode<T extends GraphNodeBase>(props: Neo4jProps): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined) continue
    out[k] = isInt(v) ? (v as { toNumber: () => number }).toNumber() : v
  }
  return out as unknown as T
}
