/**
 * Shared contracts for the NeuroPilot knowledge-graph layer.
 *
 * These types describe the graph model that `scripts/seed-neo4j.ts` loads
 * into Neo4j Aura and that the in-memory mirror serves in demo mode. The
 * query layer (`lib/graph/queries.ts`) turns them into a `ParadigmContext`,
 * which is the structured knowledge the NeuroPilot agent reasons over.
 */

/** Backend that produced a graph retrieval result. */
export type GraphSource = 'neo4j' | 'in-memory'

export const GRAPH_SOURCES = ['neo4j', 'in-memory'] as const

/** Paradigms the current knowledge graph supports. */
export const PARADIGM_KEYS = ['motor-imagery', 'ssvep', 'meditation-alpha'] as const

export type ParadigmKey = (typeof PARADIGM_KEYS)[number]

export interface ParadigmDescriptor {
  name: string
  description: string
}

/** User-facing name and description for each supported paradigm. */
export const PARADIGM_INFO: Record<ParadigmKey, ParadigmDescriptor> = {
  'motor-imagery': {
    name: 'Motor Imagery',
    description:
      'Distinguishing imagined movements (for example left vs. right hand) through sensorimotor rhythm modulation.',
  },
  ssvep: {
    name: 'SSVEP',
    description:
      'Steady-state visual evoked potentials for visual selection, driven by flickering stimuli at known frequencies.',
  },
  'meditation-alpha': {
    name: 'Meditation / Alpha Exploration',
    description:
      'Exploratory investigation of EEG changes, especially posterior alpha activity, across meditation or rest conditions.',
  },
}

/**
 * How well supported a graph relationship or recommendation is.
 * The agent must keep these three levels distinguishable in its output.
 */
export const EVIDENCE_LEVELS = ['established', 'engineering-default', 'exploratory'] as const

export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number]

/** Node labels in the NeuroPilot graph model. */
export type GraphNodeLabel =
  | 'Paradigm'
  | 'Modality'
  | 'NeuralSignal'
  | 'FrequencyBand'
  | 'BrainRegion'
  | 'Electrode'
  | 'Hardware'
  | 'ProcessingMethod'
  | 'Feature'
  | 'Classifier'
  | 'Artifact'
  | 'Confound'
  | 'ValidationMethod'
  | 'Dataset'

/**
 * Relationship types in the NeuroPilot graph model.
 * `INVESTIGATES` and `AFFECTS` support the exploratory meditation encoding.
 */
export type GraphRelationshipType =
  | 'USES_MODALITY'
  | 'HAS_MODALITY'
  | 'ASSOCIATED_WITH'
  | 'MEASURED_OVER'
  | 'MEASURED_AT'
  | 'HAS_FREQUENCY'
  | 'PROCESSED_BY'
  | 'EXTRACTED_BY'
  | 'CLASSIFIED_BY'
  | 'CONTAMINATED_BY'
  | 'CONFOUNDED_BY'
  | 'VALIDATED_BY'
  | 'REQUIRES'
  | 'COMPATIBLE_WITH'
  | 'HAS_DATASET'
  | 'RELEVANT_TO'
  | 'INVESTIGATES'
  | 'AFFECTS'

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

/**
 * Base shape shared by every node. `key` is the stable identifier the seed
 * script MERGEs on; `name` is the display name shown in the UI.
 */
export interface GraphNodeBase {
  key: string
  name: string
  description?: string
}

export interface ParadigmNode extends GraphNodeBase {
  label: 'Paradigm'
  paradigmKey: ParadigmKey
}

export interface ModalityNode extends GraphNodeBase {
  label: 'Modality'
}

/** A measurable neural phenomenon, e.g. the mu rhythm or an SSVEP response. */
export interface NeuralSignalNode extends GraphNodeBase {
  label: 'NeuralSignal'
}

export interface FrequencyBandNode extends GraphNodeBase {
  label: 'FrequencyBand'
  lowHz?: number
  highHz?: number
}

export interface BrainRegionNode extends GraphNodeBase {
  label: 'BrainRegion'
}

/** A scalp electrode in the international 10-20 system, e.g. C3 or Oz. */
export interface ElectrodeNode extends GraphNodeBase {
  label: 'Electrode'
}

export interface HardwareNode extends GraphNodeBase {
  label: 'Hardware'
  /** Channel count when known, e.g. 8 for an OpenBCI Cyton. */
  channels?: number
  /** Nominal sampling rate in Hz when known. */
  samplingRateHz?: number
  notes?: string
}

/** A signal-processing step, e.g. band-pass filtering or epoching. */
export interface ProcessingMethodNode extends GraphNodeBase {
  label: 'ProcessingMethod'
  /** Position within the processing pipeline; 1 runs first. */
  stage?: number
}

export interface FeatureNode extends GraphNodeBase {
  label: 'Feature'
}

export interface ClassifierNode extends GraphNodeBase {
  label: 'Classifier'
}

/** A signal contaminant such as EMG or eye-movement artifact. */
export interface ArtifactNode extends GraphNodeBase {
  label: 'Artifact'
}

/** A non-artifactual influence on the measurement, e.g. eye closure. */
export interface ConfoundNode extends GraphNodeBase {
  label: 'Confound'
}

export interface ValidationMethodNode extends GraphNodeBase {
  label: 'ValidationMethod'
}

export interface DatasetNode extends GraphNodeBase {
  label: 'Dataset'
  url: string
  /** Recording modality, e.g. "EEG". */
  modality: string
  /** The task or paradigm the data actually contains. */
  taskParadigm: string
  /** True for synthetic recordings — must never be presented as real EEG. */
  synthetic: boolean
  population?: string
  /** Approximate data format when known, e.g. "EDF". */
  format?: string
  useCases: string[]
  limitations: string[]
  license?: string
}

export type GraphNode =
  | ParadigmNode
  | ModalityNode
  | NeuralSignalNode
  | FrequencyBandNode
  | BrainRegionNode
  | ElectrodeNode
  | HardwareNode
  | ProcessingMethodNode
  | FeatureNode
  | ClassifierNode
  | ArtifactNode
  | ConfoundNode
  | ValidationMethodNode
  | DatasetNode

// ---------------------------------------------------------------------------
// Edges and reasoning paths
// ---------------------------------------------------------------------------

/** A directed relationship between two nodes, referenced by their keys. */
export interface GraphEdge {
  fromKey: string
  toKey: string
  type: GraphRelationshipType
  evidence?: EvidenceLevel
  note?: string
}

/**
 * One labeled hop rendered in the "Why did NeuroPilot recommend this?"
 * panel. Uses display names rather than keys.
 */
export interface ReasoningStep {
  from: string
  relationship: GraphRelationshipType
  to: string
  evidence?: EvidenceLevel
  note?: string
}

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

/**
 * Everything the graph layer can contribute for one supported paradigm:
 * the structured knowledge the agent synthesizes into a prototype plan.
 */
export interface ParadigmContext {
  paradigmKey: ParadigmKey
  paradigmName: string
  source: GraphSource
  /** Recording modality the paradigm is typically measured with, e.g. "EEG". */
  modality: string
  signals: NeuralSignalNode[]
  frequencyBands: FrequencyBandNode[]
  brainRegions: BrainRegionNode[]
  electrodes: ElectrodeNode[]
  hardware: HardwareNode[]
  processingMethods: ProcessingMethodNode[]
  features: FeatureNode[]
  classifiers: ClassifierNode[]
  artifacts: ArtifactNode[]
  confounds: ConfoundNode[]
  validationMethods: ValidationMethodNode[]
  /** Catalog datasets genuinely relevant to this paradigm. */
  datasets: DatasetNode[]
  /** Labeled hops supporting the recommendations above. */
  reasoningPath: ReasoningStep[]
}

/**
 * The complete graph: what the seed script loads into Neo4j and what the
 * in-memory mirror serves when Neo4j is not configured.
 */
export interface GraphSnapshot {
  nodes: GraphNode[]
  edges: GraphEdge[]
}
