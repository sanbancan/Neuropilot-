/**
 * Canonical seed data for the NeuroPilot knowledge graph.
 *
 * These definitions are the single source of truth for:
 * - The Neo4j seed script (`scripts/seed-neo4j.ts`)
 * - The in-memory fallback used when Neo4j is not configured
 *
 * Every relationship is intentionally explicit — the graph encodes
 * *why* each recommendation is made, not just *what* is recommended.
 */

import type {
  ArtifactNode,
  BrainRegionNode,
  ClassifierNode,
  ConfoundNode,
  DatasetNode,
  ElectrodeNode,
  FeatureNode,
  FrequencyBandNode,
  GraphEdge,
  HardwareNode,
  ModalityNode,
  NeuralSignalNode,
  ParadigmKey,
  ParadigmNode,
  ProcessingMethodNode,
  ReasoningStep,
  ValidationMethodNode,
} from '@/lib/graph/types'

// ═══════════════════════════════════════════════════════════════════════════
// NODES
// ═══════════════════════════════════════════════════════════════════════════

// ── Paradigms ──────────────────────────────────────────────────────────────

export const paradigmNodes: ParadigmNode[] = [
  {
    key: 'motor-imagery',
    name: 'Motor Imagery',
    label: 'Paradigm',
    paradigmKey: 'motor-imagery',
    description:
      'Distinguishing imagined movements through sensorimotor rhythm modulation.',
  },
  {
    key: 'ssvep',
    name: 'SSVEP',
    label: 'Paradigm',
    paradigmKey: 'ssvep',
    description:
      'Steady-state visual evoked potentials driven by flickering stimuli at known frequencies.',
  },
  {
    key: 'meditation-alpha',
    name: 'Meditation / Alpha Exploration',
    label: 'Paradigm',
    paradigmKey: 'meditation-alpha',
    description:
      'Exploratory investigation of EEG changes, especially posterior alpha activity, across meditation or rest conditions.',
  },
]

// ── Modalities ─────────────────────────────────────────────────────────────

export const modalityNodes: ModalityNode[] = [
  {
    key: 'eeg',
    name: 'EEG',
    label: 'Modality',
    description: 'Electroencephalography — non-invasive scalp recording.',
  },
]

// ── Neural signals ─────────────────────────────────────────────────────────

export const neuralSignalNodes: NeuralSignalNode[] = [
  {
    key: 'mu-rhythm',
    name: 'Mu Rhythm',
    label: 'NeuralSignal',
    description:
      '8–13 Hz oscillation over sensorimotor cortex that desynchronises during movement or motor imagery.',
  },
  {
    key: 'beta-activity',
    name: 'Beta Activity',
    label: 'NeuralSignal',
    description:
      '13–30 Hz sensorimotor oscillation involved in movement planning and imagery.',
  },
  {
    key: 'ssvep-response',
    name: 'SSVEP Response',
    label: 'NeuralSignal',
    description:
      'Oscillatory response in visual cortex phase-locked to repetitive visual stimulation.',
  },
  {
    key: 'alpha-activity',
    name: 'Alpha Activity',
    label: 'NeuralSignal',
    description:
      '8–13 Hz oscillation most prominent at rest, especially over posterior cortex.',
  },
  {
    key: 'posterior-alpha',
    name: 'Posterior Alpha',
    label: 'NeuralSignal',
    description:
      'Alpha-band activity localised to posterior / occipital regions, strongly modulated by eye state.',
  },
]

// ── Frequency bands ────────────────────────────────────────────────────────

export const frequencyBandNodes: FrequencyBandNode[] = [
  {
    key: 'alpha-band',
    name: 'Alpha Band',
    label: 'FrequencyBand',
    lowHz: 8,
    highHz: 13,
    description: '8–13 Hz — dominant during relaxed wakefulness and idling.',
  },
  {
    key: 'beta-band',
    name: 'Beta Band',
    label: 'FrequencyBand',
    lowHz: 13,
    highHz: 30,
    description:
      '13–30 Hz — associated with active thinking, focus, and motor control.',
  },
]

// ── Brain regions ──────────────────────────────────────────────────────────

export const brainRegionNodes: BrainRegionNode[] = [
  {
    key: 'sensorimotor-cortex',
    name: 'Sensorimotor Cortex',
    label: 'BrainRegion',
    description:
      'Cortical area around the central sulcus responsible for movement planning and execution.',
  },
  {
    key: 'occipital-cortex',
    name: 'Occipital Cortex',
    label: 'BrainRegion',
    description: 'Visual processing area at the back of the brain.',
  },
  {
    key: 'posterior-regions',
    name: 'Posterior Regions',
    label: 'BrainRegion',
    description:
      'Occipital and parietal scalp areas where alpha activity is most prominent during rest.',
  },
]

// ── Electrodes (international 10-20) ──────────────────────────────────────

export const electrodeNodes: ElectrodeNode[] = [
  {
    key: 'c3',
    name: 'C3',
    label: 'Electrode',
    description: 'Left sensorimotor area — contralateral to right-hand imagery.',
  },
  {
    key: 'cz',
    name: 'Cz',
    label: 'Electrode',
    description: 'Vertex — central reference for sensorimotor recordings.',
  },
  {
    key: 'c4',
    name: 'C4',
    label: 'Electrode',
    description: 'Right sensorimotor area — contralateral to left-hand imagery.',
  },
  {
    key: 'o1',
    name: 'O1',
    label: 'Electrode',
    description: 'Left occipital site.',
  },
  {
    key: 'oz',
    name: 'Oz',
    label: 'Electrode',
    description: 'Midline occipital site.',
  },
  {
    key: 'o2',
    name: 'O2',
    label: 'Electrode',
    description: 'Right occipital site.',
  },
  {
    key: 'p3',
    name: 'P3',
    label: 'Electrode',
    description: 'Left parietal site — posterior alpha coverage.',
  },
  {
    key: 'pz',
    name: 'Pz',
    label: 'Electrode',
    description: 'Midline parietal site — posterior alpha coverage.',
  },
  {
    key: 'p4',
    name: 'P4',
    label: 'Electrode',
    description: 'Right parietal site — posterior alpha coverage.',
  },
]

// ── Hardware ───────────────────────────────────────────────────────────────

export const hardwareNodes: HardwareNode[] = [
  {
    key: 'eeg-amplifier',
    name: 'EEG Amplifier',
    label: 'Hardware',
    samplingRateHz: 256,
    notes:
      'Standard research-grade amplifier; ≥ 256 Hz sampling recommended for BCI.',
  },
]

// ── Processing methods ────────────────────────────────────────────────────

export const processingMethodNodes: ProcessingMethodNode[] = [
  {
    key: 'bandpass-filter',
    name: 'Band-pass Filtering',
    label: 'ProcessingMethod',
    stage: 1,
    description: 'Isolate the frequency band of interest (e.g. 8–30 Hz for MI).',
  },
  {
    key: 'epoching',
    name: 'Epoching',
    label: 'ProcessingMethod',
    stage: 2,
    description: 'Segment continuous EEG into time-locked trial windows.',
  },
  {
    key: 'artifact-removal',
    name: 'Artifact Removal',
    label: 'ProcessingMethod',
    stage: 3,
    description: 'Remove or attenuate non-neural contaminants (e.g. via ICA).',
  },
  {
    key: 'spectral-analysis',
    name: 'Spectral Analysis',
    label: 'ProcessingMethod',
    stage: 1,
    description: 'Transform time-domain signal to frequency domain (e.g. FFT).',
  },
  {
    key: 'visual-stimulation',
    name: 'Visual Stimulation',
    label: 'ProcessingMethod',
    description:
      'Repetitive flickering stimulus at target frequencies to elicit SSVEP.',
  },
  {
    key: 'psd',
    name: 'Power Spectral Density',
    label: 'ProcessingMethod',
    stage: 1,
    description: 'Estimate power distribution across frequency bands (e.g. Welch).',
  },
  {
    key: 'bandpower',
    name: 'Band Power Extraction',
    label: 'ProcessingMethod',
    stage: 2,
    description: 'Compute integrated power within a target frequency band.',
  },
]

// ── Features ───────────────────────────────────────────────────────────────

export const featureNodes: FeatureNode[] = [
  {
    key: 'csp',
    name: 'Common Spatial Patterns',
    label: 'Feature',
    description:
      'Spatial filters that maximise variance for one class while minimising it for another.',
  },
  {
    key: 'band-power-feature',
    name: 'Band Power',
    label: 'Feature',
    description: 'Log-transformed power in a specific frequency band per channel.',
  },
  {
    key: 'frequency-domain-features',
    name: 'Frequency-Domain Features',
    label: 'Feature',
    description:
      'Spectral peaks and power at stimulation frequency and its harmonics.',
  },
]

// ── Classifiers ────────────────────────────────────────────────────────────

export const classifierNodes: ClassifierNode[] = [
  {
    key: 'lda',
    name: 'Linear Discriminant Analysis',
    label: 'Classifier',
    description:
      'Simple, robust linear classifier — common default for MI-BCI prototypes.',
  },
  {
    key: 'cca',
    name: 'Canonical Correlation Analysis',
    label: 'Classifier',
    description:
      'Correlates EEG with reference sine waves at target frequencies — effective for SSVEP.',
  },
]

// ── Artifacts ──────────────────────────────────────────────────────────────

export const artifactNodes: ArtifactNode[] = [
  {
    key: 'emg-artifact',
    name: 'EMG Artifact',
    label: 'Artifact',
    description: 'Muscle activity contaminating EEG, especially in the beta band.',
  },
  {
    key: 'eye-artifacts',
    name: 'Eye Artifacts',
    label: 'Artifact',
    description: 'Saccades and blinks producing large frontal deflections.',
  },
  {
    key: 'movement-artifacts',
    name: 'Movement Artifacts',
    label: 'Artifact',
    description: 'Electrode displacement or cable sway during movement.',
  },
  {
    key: 'visual-fatigue',
    name: 'Visual Fatigue',
    label: 'Artifact',
    description: 'Decreased SSVEP amplitude with prolonged stimulation.',
  },
]

// ── Confounds ──────────────────────────────────────────────────────────────

export const confoundNodes: ConfoundNode[] = [
  {
    key: 'actual-hand-movement',
    name: 'Actual Hand Movement',
    label: 'Confound',
    description:
      'Overt movement instead of imagery — must be monitored and excluded.',
  },
  {
    key: 'eye-closure',
    name: 'Eye Closure',
    label: 'Confound',
    description:
      'Closing the eyes dramatically increases posterior alpha power — must be controlled for in alpha experiments.',
  },
  {
    key: 'drowsiness',
    name: 'Drowsiness',
    label: 'Confound',
    description:
      'Sleep onset increases alpha and theta power, confounding meditation-related alpha changes.',
  },
  {
    key: 'attention-variation',
    name: 'Attention Variation',
    label: 'Confound',
    description:
      'Fluctuating attention modulates SSVEP amplitude — consistent fixation is required.',
  },
]

// ── Validation methods ─────────────────────────────────────────────────────

export const validationMethodNodes: ValidationMethodNode[] = [
  {
    key: 'cross-validation',
    name: 'Cross-Validation',
    label: 'ValidationMethod',
    description:
      'Repeated balanced trials with held-out test set to assess decoding above chance.',
  },
]

// ── Datasets ───────────────────────────────────────────────────────────────

export const datasetNodes: DatasetNode[] = [
  {
    key: 'dataset-hbn-mri-eeg',
    name: 'Healthy Brain Network MRI + EEG',
    label: 'Dataset',
    url: 'https://fcon_1000.projects.nitrc.org/indi/cmi_healthy_brain_network/MRI_EEG.html',
    modality: 'EEG + MRI',
    taskParadigm: 'Resting state and cognitive tasks',
    synthetic: false,
    population: 'Children and adolescents (5–21 years)',
    useCases: ['Developmental neuroscience', 'Resting-state analysis'],
    limitations: [
      'Pediatric population limits direct BCI applicability',
      'No motor imagery or SSVEP protocols',
    ],
    description:
      'Large-scale multimodal dataset combining MRI and EEG in a developmental cohort.',
  },
  {
    key: 'dataset-bitbrain-sleep',
    name: 'Bitbrain Ikon Sleep EEG',
    label: 'Dataset',
    url: 'https://downloads.bitbrain.com/products/hardware/ikon-sleep#datasets',
    modality: 'EEG',
    taskParadigm: 'Sleep recording',
    synthetic: false,
    useCases: ['Sleep research', 'Sleep-stage classification'],
    limitations: [
      'Sleep-specific — not applicable to active BCI paradigms such as motor imagery or SSVEP',
    ],
    description: 'Sleep EEG recordings from the Bitbrain Ikon consumer headset.',
  },
  {
    key: 'dataset-neurazum-eeg',
    name: 'Neurazum EEG Dataset Collection',
    label: 'Dataset',
    url: 'https://huggingface.co/collections/Neurazum/eeg-datasets',
    modality: 'EEG',
    taskParadigm: 'Various (synthetic)',
    synthetic: true,
    useCases: ['Algorithm testing', 'Pipeline development', 'Benchmarking'],
    limitations: [
      'Synthetic data — does not represent real human EEG recordings',
    ],
    description: 'Collection of synthetic EEG datasets for development and testing.',
  },
  {
    key: 'dataset-bonn-eeg',
    name: 'Bonn EEG Dataset',
    label: 'Dataset',
    url: 'https://www.kaggle.com/datasets/quands/eeg-dataset',
    modality: 'EEG',
    taskParadigm: 'Eyes open / eyes closed',
    synthetic: false,
    useCases: [
      'Alpha rhythm research',
      'Eye-state classification',
      'Resting-state EEG analysis',
    ],
    limitations: [
      'Limited paradigm scope — only eyes open / eyes closed conditions',
    ],
    description:
      'Classic EEG dataset with eyes-open and eyes-closed recordings, relevant to alpha-band and eye-state research.',
  },
]

// ── Aggregated node list (used by the seed script) ────────────────────────

export const ALL_NODES = [
  ...paradigmNodes,
  ...modalityNodes,
  ...neuralSignalNodes,
  ...frequencyBandNodes,
  ...brainRegionNodes,
  ...electrodeNodes,
  ...hardwareNodes,
  ...processingMethodNodes,
  ...featureNodes,
  ...classifierNodes,
  ...artifactNodes,
  ...confoundNodes,
  ...validationMethodNodes,
  ...datasetNodes,
]

// ═══════════════════════════════════════════════════════════════════════════
// EDGES
// ═══════════════════════════════════════════════════════════════════════════

export const ALL_EDGES: GraphEdge[] = [
  // ── Motor Imagery ──────────────────────────────────────────────────────

  // Paradigm → Modality / Signals
  { fromKey: 'motor-imagery', toKey: 'eeg', type: 'USES_MODALITY', evidence: 'established' },
  { fromKey: 'motor-imagery', toKey: 'mu-rhythm', type: 'ASSOCIATED_WITH', evidence: 'established' },
  { fromKey: 'motor-imagery', toKey: 'beta-activity', type: 'ASSOCIATED_WITH', evidence: 'established' },

  // Signals → Frequency bands
  { fromKey: 'mu-rhythm', toKey: 'alpha-band', type: 'HAS_FREQUENCY', evidence: 'established', note: 'Mu rhythm occupies the alpha frequency range' },
  { fromKey: 'beta-activity', toKey: 'beta-band', type: 'HAS_FREQUENCY', evidence: 'established' },

  // Signals → Brain region
  { fromKey: 'mu-rhythm', toKey: 'sensorimotor-cortex', type: 'MEASURED_OVER', evidence: 'established' },
  { fromKey: 'beta-activity', toKey: 'sensorimotor-cortex', type: 'MEASURED_OVER', evidence: 'established' },

  // Region → Electrodes
  { fromKey: 'sensorimotor-cortex', toKey: 'c3', type: 'MEASURED_AT', evidence: 'established' },
  { fromKey: 'sensorimotor-cortex', toKey: 'cz', type: 'MEASURED_AT', evidence: 'established' },
  { fromKey: 'sensorimotor-cortex', toKey: 'c4', type: 'MEASURED_AT', evidence: 'established' },

  // Modality → Hardware
  { fromKey: 'eeg', toKey: 'eeg-amplifier', type: 'REQUIRES', evidence: 'engineering-default' },

  // Paradigm → Processing
  { fromKey: 'motor-imagery', toKey: 'bandpass-filter', type: 'PROCESSED_BY', evidence: 'engineering-default' },
  { fromKey: 'motor-imagery', toKey: 'epoching', type: 'PROCESSED_BY', evidence: 'engineering-default' },
  { fromKey: 'motor-imagery', toKey: 'artifact-removal', type: 'PROCESSED_BY', evidence: 'engineering-default' },

  // Features
  { fromKey: 'motor-imagery', toKey: 'csp', type: 'EXTRACTED_BY', evidence: 'established' },
  { fromKey: 'motor-imagery', toKey: 'band-power-feature', type: 'EXTRACTED_BY', evidence: 'established' },

  // Classifier
  { fromKey: 'motor-imagery', toKey: 'lda', type: 'CLASSIFIED_BY', evidence: 'established' },

  // Artifacts & confounds
  { fromKey: 'motor-imagery', toKey: 'emg-artifact', type: 'CONTAMINATED_BY', evidence: 'established' },
  { fromKey: 'motor-imagery', toKey: 'eye-artifacts', type: 'CONTAMINATED_BY', evidence: 'established' },
  { fromKey: 'motor-imagery', toKey: 'movement-artifacts', type: 'CONTAMINATED_BY', evidence: 'established' },
  { fromKey: 'motor-imagery', toKey: 'actual-hand-movement', type: 'CONFOUNDED_BY', evidence: 'established' },

  // Validation
  { fromKey: 'motor-imagery', toKey: 'cross-validation', type: 'VALIDATED_BY', evidence: 'engineering-default' },

  // ── SSVEP ──────────────────────────────────────────────────────────────

  { fromKey: 'ssvep', toKey: 'eeg', type: 'USES_MODALITY', evidence: 'established' },
  { fromKey: 'ssvep', toKey: 'ssvep-response', type: 'ASSOCIATED_WITH', evidence: 'established' },
  { fromKey: 'ssvep', toKey: 'visual-stimulation', type: 'REQUIRES', evidence: 'established', note: 'Repetitive visual stimulation at target frequencies' },

  // Signal → Region / Frequency
  { fromKey: 'ssvep-response', toKey: 'occipital-cortex', type: 'MEASURED_OVER', evidence: 'established' },
  { fromKey: 'ssvep-response', toKey: 'alpha-band', type: 'HAS_FREQUENCY', evidence: 'established', note: 'Stimulation frequencies often in the alpha range (8–13 Hz)' },

  // Region → Electrodes
  { fromKey: 'occipital-cortex', toKey: 'o1', type: 'MEASURED_AT', evidence: 'established' },
  { fromKey: 'occipital-cortex', toKey: 'oz', type: 'MEASURED_AT', evidence: 'established' },
  { fromKey: 'occipital-cortex', toKey: 'o2', type: 'MEASURED_AT', evidence: 'established' },

  // Processing / Features / Classifier
  { fromKey: 'ssvep', toKey: 'spectral-analysis', type: 'PROCESSED_BY', evidence: 'established' },
  { fromKey: 'ssvep', toKey: 'frequency-domain-features', type: 'EXTRACTED_BY', evidence: 'established' },
  { fromKey: 'ssvep', toKey: 'cca', type: 'CLASSIFIED_BY', evidence: 'established' },

  // Artifact & Confound
  { fromKey: 'ssvep', toKey: 'visual-fatigue', type: 'CONTAMINATED_BY', evidence: 'engineering-default' },
  { fromKey: 'ssvep', toKey: 'eye-artifacts', type: 'CONTAMINATED_BY', evidence: 'established' },

  // Validation
  { fromKey: 'ssvep', toKey: 'cross-validation', type: 'VALIDATED_BY', evidence: 'engineering-default' },

  // ── Meditation / Alpha ─────────────────────────────────────────────────

  { fromKey: 'meditation-alpha', toKey: 'eeg', type: 'USES_MODALITY', evidence: 'established' },
  { fromKey: 'meditation-alpha', toKey: 'alpha-activity', type: 'INVESTIGATES', evidence: 'exploratory', note: 'Meditation experiments may investigate alpha-band activity' },

  // Alpha activity relationships
  { fromKey: 'alpha-activity', toKey: 'alpha-band', type: 'HAS_FREQUENCY', evidence: 'established' },
  { fromKey: 'alpha-activity', toKey: 'eeg', type: 'USES_MODALITY', evidence: 'established', note: 'Alpha activity measured with EEG' },
  { fromKey: 'posterior-alpha', toKey: 'alpha-activity', type: 'ASSOCIATED_WITH', evidence: 'established', note: 'Posterior alpha is a spatial subset of alpha activity' },
  { fromKey: 'posterior-alpha', toKey: 'posterior-regions', type: 'MEASURED_OVER', evidence: 'established' },

  // Region → Region → Electrodes
  { fromKey: 'posterior-regions', toKey: 'occipital-cortex', type: 'ASSOCIATED_WITH', evidence: 'established' },
  { fromKey: 'posterior-regions', toKey: 'o1', type: 'MEASURED_AT', evidence: 'established' },
  { fromKey: 'posterior-regions', toKey: 'oz', type: 'MEASURED_AT', evidence: 'established' },
  { fromKey: 'posterior-regions', toKey: 'o2', type: 'MEASURED_AT', evidence: 'established' },
  { fromKey: 'posterior-regions', toKey: 'p3', type: 'MEASURED_AT', evidence: 'established' },
  { fromKey: 'posterior-regions', toKey: 'pz', type: 'MEASURED_AT', evidence: 'established' },
  { fromKey: 'posterior-regions', toKey: 'p4', type: 'MEASURED_AT', evidence: 'established' },

  // Processing
  { fromKey: 'alpha-activity', toKey: 'psd', type: 'EXTRACTED_BY', evidence: 'engineering-default' },
  { fromKey: 'alpha-activity', toKey: 'bandpower', type: 'EXTRACTED_BY', evidence: 'engineering-default' },
  { fromKey: 'psd', toKey: 'bandpower', type: 'ASSOCIATED_WITH', evidence: 'engineering-default', note: 'Band power is derived from the PSD estimate' },

  // Critical confound: eye closure → posterior alpha
  { fromKey: 'eye-closure', toKey: 'posterior-alpha', type: 'AFFECTS', evidence: 'established', note: 'Eye closure dramatically increases posterior alpha power' },
  { fromKey: 'drowsiness', toKey: 'alpha-activity', type: 'AFFECTS', evidence: 'established', note: 'Drowsiness increases alpha and theta power' },

  // Dataset relevance
  { fromKey: 'dataset-bonn-eeg', toKey: 'meditation-alpha', type: 'RELEVANT_TO', evidence: 'exploratory', note: 'Eyes-open / eyes-closed conditions directly relevant to alpha / eye-state exploration' },

  // Explicit paradigm-level edges for meditation-alpha confounds and posterior signals.
  // These ensure the forward-only in-memory BFS can reach all relevant nodes
  // without requiring deep multi-hop traversal through intermediate signal nodes.
  { fromKey: 'meditation-alpha', toKey: 'posterior-alpha', type: 'INVESTIGATES', evidence: 'exploratory', note: 'Posterior alpha is the primary signal of interest in meditation studies' },
  { fromKey: 'meditation-alpha', toKey: 'posterior-regions', type: 'ASSOCIATED_WITH', evidence: 'exploratory', note: 'Meditation studies focus on posterior brain regions' },
  { fromKey: 'meditation-alpha', toKey: 'eye-closure', type: 'CONFOUNDED_BY', evidence: 'established', note: 'Eye closure is a critical confound in alpha-band meditation research' },
  { fromKey: 'meditation-alpha', toKey: 'drowsiness', type: 'CONFOUNDED_BY', evidence: 'established', note: 'Drowsiness can mimic meditation-related alpha increases' },

  // Explicit SSVEP confound
  { fromKey: 'ssvep', toKey: 'attention-variation', type: 'CONFOUNDED_BY', evidence: 'engineering-default', note: 'Fluctuating attention modulates SSVEP amplitude' },
]

// ═══════════════════════════════════════════════════════════════════════════
// REASONING PATHS
// ═══════════════════════════════════════════════════════════════════════════
//
// Curated hops rendered in the "Why did NeuroPilot recommend this?" panel.
// Each path follows the most informative chain through the graph for that
// paradigm, using display names rather than internal keys.
// ═══════════════════════════════════════════════════════════════════════════

export const REASONING_PATHS: Record<ParadigmKey, ReasoningStep[]> = {
  'motor-imagery': [
    { from: 'Motor Imagery', relationship: 'USES_MODALITY', to: 'EEG', evidence: 'established' },
    { from: 'Motor Imagery', relationship: 'ASSOCIATED_WITH', to: 'Mu Rhythm', evidence: 'established' },
    { from: 'Motor Imagery', relationship: 'ASSOCIATED_WITH', to: 'Beta Activity', evidence: 'established' },
    { from: 'Mu Rhythm', relationship: 'MEASURED_OVER', to: 'Sensorimotor Cortex', evidence: 'established' },
    { from: 'Sensorimotor Cortex', relationship: 'MEASURED_AT', to: 'C3', evidence: 'established' },
    { from: 'Sensorimotor Cortex', relationship: 'MEASURED_AT', to: 'Cz', evidence: 'established' },
    { from: 'Sensorimotor Cortex', relationship: 'MEASURED_AT', to: 'C4', evidence: 'established' },
    { from: 'Motor Imagery', relationship: 'PROCESSED_BY', to: 'Band-pass Filtering', evidence: 'engineering-default' },
    { from: 'Motor Imagery', relationship: 'PROCESSED_BY', to: 'Epoching', evidence: 'engineering-default' },
    { from: 'Motor Imagery', relationship: 'PROCESSED_BY', to: 'Artifact Removal', evidence: 'engineering-default' },
    { from: 'Motor Imagery', relationship: 'EXTRACTED_BY', to: 'Common Spatial Patterns', evidence: 'established' },
    { from: 'Motor Imagery', relationship: 'CLASSIFIED_BY', to: 'Linear Discriminant Analysis', evidence: 'established' },
    { from: 'Motor Imagery', relationship: 'VALIDATED_BY', to: 'Cross-Validation', evidence: 'engineering-default' },
    { from: 'Motor Imagery', relationship: 'CONFOUNDED_BY', to: 'Actual Hand Movement', evidence: 'established' },
    { from: 'Motor Imagery', relationship: 'CONTAMINATED_BY', to: 'EMG Artifact', evidence: 'established' },
    { from: 'Motor Imagery', relationship: 'CONTAMINATED_BY', to: 'Eye Artifacts', evidence: 'established' },
  ],

  ssvep: [
    { from: 'SSVEP', relationship: 'USES_MODALITY', to: 'EEG', evidence: 'established' },
    { from: 'SSVEP', relationship: 'ASSOCIATED_WITH', to: 'SSVEP Response', evidence: 'established' },
    { from: 'SSVEP Response', relationship: 'MEASURED_OVER', to: 'Occipital Cortex', evidence: 'established' },
    { from: 'Occipital Cortex', relationship: 'MEASURED_AT', to: 'O1', evidence: 'established' },
    { from: 'Occipital Cortex', relationship: 'MEASURED_AT', to: 'Oz', evidence: 'established' },
    { from: 'Occipital Cortex', relationship: 'MEASURED_AT', to: 'O2', evidence: 'established' },
    { from: 'SSVEP', relationship: 'REQUIRES', to: 'Visual Stimulation', evidence: 'established', note: 'Repetitive flickering stimulus at target frequencies' },
    { from: 'SSVEP', relationship: 'PROCESSED_BY', to: 'Spectral Analysis', evidence: 'established' },
    { from: 'SSVEP', relationship: 'EXTRACTED_BY', to: 'Frequency-Domain Features', evidence: 'established' },
    { from: 'SSVEP', relationship: 'CLASSIFIED_BY', to: 'Canonical Correlation Analysis', evidence: 'established' },
    { from: 'SSVEP', relationship: 'VALIDATED_BY', to: 'Cross-Validation', evidence: 'engineering-default' },
    { from: 'SSVEP', relationship: 'CONTAMINATED_BY', to: 'Visual Fatigue', evidence: 'engineering-default' },
    { from: 'SSVEP', relationship: 'CONFOUNDED_BY', to: 'Attention Variation', evidence: 'engineering-default', note: 'Fluctuating attention modulates SSVEP amplitude' },
  ],

  'meditation-alpha': [
    { from: 'Meditation / Alpha Exploration', relationship: 'INVESTIGATES', to: 'Alpha Activity', evidence: 'exploratory' },
    { from: 'Alpha Activity', relationship: 'HAS_FREQUENCY', to: 'Alpha Band', evidence: 'established' },
    { from: 'Alpha Activity', relationship: 'USES_MODALITY', to: 'EEG', evidence: 'established' },
    { from: 'Posterior Alpha', relationship: 'MEASURED_OVER', to: 'Posterior Regions', evidence: 'established' },
    { from: 'Posterior Regions', relationship: 'MEASURED_AT', to: 'O1', evidence: 'established' },
    { from: 'Posterior Regions', relationship: 'MEASURED_AT', to: 'Oz', evidence: 'established' },
    { from: 'Posterior Regions', relationship: 'MEASURED_AT', to: 'O2', evidence: 'established' },
    { from: 'Alpha Activity', relationship: 'EXTRACTED_BY', to: 'Power Spectral Density', evidence: 'engineering-default' },
    { from: 'Alpha Activity', relationship: 'EXTRACTED_BY', to: 'Band Power Extraction', evidence: 'engineering-default' },
    { from: 'Eye Closure', relationship: 'AFFECTS', to: 'Posterior Alpha', evidence: 'established', note: 'Eye closure dramatically increases posterior alpha power' },
    { from: 'Drowsiness', relationship: 'AFFECTS', to: 'Alpha Activity', evidence: 'established', note: 'Drowsiness increases alpha and theta power' },
  ],
}
