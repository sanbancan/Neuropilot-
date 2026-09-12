/**
 * NeuroPilot shared domain types.
 *
 * Single import surface for the app: re-exports the types inferred from the
 * Zod contracts in `lib/schemas/design.ts` together with the graph-model
 * vocabulary from `lib/graph/types.ts`, so feature code can import
 * everything from "@/types/neuropilot".
 */

export type {
  DesignRequest,
  ModalityInput,
  NamedReason,
  PlanStep,
  PlanConfound,
  ReasoningPathStep,
  RelevantDataset,
  PrototypePlan,
  PlanGenerator,
  DesignPlanMeta,
  DesignResponse,
  DesignErrorCode,
  DesignErrorResponse,
} from '@/lib/schemas/design'

export type {
  GraphSource,
  ParadigmKey,
  ParadigmDescriptor,
  EvidenceLevel,
  GraphNodeLabel,
  GraphRelationshipType,
  GraphNodeBase,
  ParadigmNode,
  ModalityNode,
  NeuralSignalNode,
  FrequencyBandNode,
  BrainRegionNode,
  ElectrodeNode,
  HardwareNode,
  ProcessingMethodNode,
  FeatureNode,
  ClassifierNode,
  ArtifactNode,
  ConfoundNode,
  ValidationMethodNode,
  DatasetNode,
  GraphNode,
  GraphEdge,
  ReasoningStep,
  ParadigmContext,
  GraphSnapshot,
} from '@/lib/graph/types'

export {
  PARADIGM_KEYS,
  PARADIGM_INFO,
  EVIDENCE_LEVELS,
  GRAPH_SOURCES,
} from '@/lib/graph/types'
export { MODALITY_INPUTS, PLAN_GENERATORS, DESIGN_ERROR_CODES } from '@/lib/schemas/design'
