/**
 * In-memory mirror of the NeuroPilot knowledge graph.
 *
 * When Neo4j is not configured (demo / hackathon mode), this module supplies
 * the same structured `ParadigmContext` that `getParadigmContext()` would
 * retrieve from the graph database.  The data is scientifically grounded but
 * intentionally compact — it is a starting-point for prototyping, not a
 * comprehensive neuroscience reference.
 */

import type {
  ParadigmContext,
  ReasoningStep,
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
} from './types'

// ---------------------------------------------------------------------------
// Motor Imagery
// ---------------------------------------------------------------------------

const miSignals: NeuralSignalNode[] = [
  { key: 'mu-rhythm', name: 'Mu rhythm (8–13 Hz)', label: 'NeuralSignal', description: 'Sensorimotor rhythm that desynchronises during imagined and actual movement.' },
  { key: 'beta-rhythm', name: 'Beta rhythm (13–30 Hz)', label: 'NeuralSignal', description: 'Beta-band ERD/ERS over sensorimotor cortex modulated by motor imagery.' },
]

const miFreqBands: FrequencyBandNode[] = [
  { key: 'mu-band', name: 'Mu (8–13 Hz)', label: 'FrequencyBand', lowHz: 8, highHz: 13 },
  { key: 'beta-band', name: 'Beta (13–30 Hz)', label: 'FrequencyBand', lowHz: 13, highHz: 30 },
]

const miRegions: BrainRegionNode[] = [
  { key: 'sensorimotor-cortex', name: 'Sensorimotor cortex', label: 'BrainRegion', description: 'Primary motor and somatosensory cortices around the central sulcus.' },
]

const miElectrodes: ElectrodeNode[] = [
  { key: 'C3', name: 'C3', label: 'Electrode', description: 'Left sensorimotor — contralateral to right-hand imagery.' },
  { key: 'C4', name: 'C4', label: 'Electrode', description: 'Right sensorimotor — contralateral to left-hand imagery.' },
  { key: 'Cz', name: 'Cz', label: 'Electrode', description: 'Midline central — captures bilateral sensorimotor modulation.' },
]

const miHardware: HardwareNode[] = [
  { key: 'openbci-cyton', name: 'OpenBCI Cyton', label: 'Hardware', channels: 8, samplingRateHz: 250, notes: 'Affordable research-grade; 8 channels sufficient for basic MI.' },
  { key: 'emotiv-epoc-x', name: 'Emotiv EPOC X', label: 'Hardware', channels: 14, samplingRateHz: 256, notes: 'Consumer headset with wet felt sensors; moderate signal quality.' },
  { key: 'gtec-unicorn', name: 'g.tec unicorn', label: 'Hardware', channels: 8, samplingRateHz: 250, notes: 'Dry-electrode headset optimised for BCI applications.' },
]

const miProcessing: ProcessingMethodNode[] = [
  { key: 'bandpass-mi', name: 'Band-pass filter (8–30 Hz)', label: 'ProcessingMethod', stage: 1, description: 'Isolate mu and beta bands from broadband EEG.' },
  { key: 'epoching-mi', name: 'Epoching (trial-based)', label: 'ProcessingMethod', stage: 2, description: 'Segment continuous EEG into trials aligned to cue onset (e.g. 0–4 s).' },
  { key: 'artifact-rejection-mi', name: 'Artifact rejection / ICA', label: 'ProcessingMethod', stage: 3, description: 'Remove or correct EMG, EOG, and movement artifacts.' },
]

const miFeatures: FeatureNode[] = [
  { key: 'csp', name: 'Common Spatial Patterns (CSP)', label: 'Feature', description: 'Spatial filters maximising variance difference between two MI classes.' },
  { key: 'band-power-mi', name: 'Log band-power', label: 'Feature', description: 'Log-transformed power in mu/beta bands per channel — simple baseline.' },
]

const miClassifiers: ClassifierNode[] = [
  { key: 'lda-mi', name: 'Linear Discriminant Analysis (LDA)', label: 'Classifier', description: 'Fast linear classifier; strong baseline for CSP features.' },
  { key: 'svm-mi', name: 'Support Vector Machine (SVM)', label: 'Classifier', description: 'Robust linear or RBF-kernel classifier for MI feature vectors.' },
]

const miArtifacts: ArtifactNode[] = [
  { key: 'emg-artifact', name: 'EMG contamination', label: 'Artifact', description: 'Muscle activity from jaw clenching or scalp tension overlaps mu/beta bands.' },
  { key: 'eog-artifact', name: 'Eye-movement artifact', label: 'Artifact', description: 'Saccades and blinks produce large low-frequency deflections.' },
]

const miConfounds: ConfoundNode[] = [
  { key: 'mi-kinesthetic', name: 'Kinesthetic vs. visual imagery', label: 'Confound', description: 'Users may adopt different imagery strategies (first-person feel vs. visualisation), altering spatial patterns.' },
  { key: 'mi-fatigue', name: 'Mental fatigue', label: 'Confound', description: 'MI performance degrades over long sessions; ERD magnitude decreases.' },
  { key: 'mi-class-imbalance', name: 'Class imbalance', label: 'Confound', description: 'One hand may consistently dominate; balanced trial counts are essential.' },
]

const miValidation: ValidationMethodNode[] = [
  { key: 'cross-val-mi', name: 'Session-level cross-validation', label: 'ValidationMethod', description: 'K-fold CV across trials; report balanced accuracy.' },
  { key: 'chance-level-mi', name: 'Chance-level comparison', label: 'ValidationMethod', description: 'For 2-class MI the chance level is 50 %; results must significantly exceed this.' },
]

const miDatasets: DatasetNode[] = [
  { key: 'bci-comp-iv-2a', name: 'BCI Competition IV-2a', label: 'Dataset', url: 'https://www.bbci.de/competition/iv/', modality: 'EEG', taskParadigm: 'Motor imagery (left hand, right hand, feet, tongue)', synthetic: false, population: '9 healthy subjects', format: 'GDF', useCases: ['MI classifier benchmarking'], limitations: ['Small subject pool', 'Lab setting only'], license: 'Academic use' },
  { key: 'physionet-mi', name: 'PhysioNet EEG Motor Movement/Imagery Dataset', label: 'Dataset', url: 'https://physionet.org/content/eegmmidb/', modality: 'EEG', taskParadigm: 'Motor execution and motor imagery (hands and feet)', synthetic: false, population: '109 subjects', format: 'EDF+', useCases: ['Large-scale MI research', 'Transfer learning'], limitations: ['Variable task compliance'], license: 'Open Data Commons Attribution License v1.0' },
]

const miReasoning: ReasoningStep[] = [
  { from: 'Motor Imagery', relationship: 'USES_MODALITY', to: 'EEG', evidence: 'established', note: 'MI is classically decoded from scalp EEG.' },
  { from: 'Motor Imagery', relationship: 'ASSOCIATED_WITH', to: 'Mu rhythm (8–13 Hz)', evidence: 'established', note: 'Mu ERD is the primary marker of sensorimotor engagement.' },
  { from: 'Motor Imagery', relationship: 'ASSOCIATED_WITH', to: 'Beta rhythm (13–30 Hz)', evidence: 'established', note: 'Beta ERD/ERS complements mu for classification.' },
  { from: 'Mu rhythm (8–13 Hz)', relationship: 'MEASURED_AT', to: 'C3', evidence: 'established' },
  { from: 'Mu rhythm (8–13 Hz)', relationship: 'MEASURED_AT', to: 'C4', evidence: 'established' },
  { from: 'Motor Imagery', relationship: 'PROCESSED_BY', to: 'Common Spatial Patterns (CSP)', evidence: 'established', note: 'CSP is the gold-standard spatial filter for two-class MI.' },
  { from: 'Motor Imagery', relationship: 'CLASSIFIED_BY', to: 'Linear Discriminant Analysis (LDA)', evidence: 'engineering-default' },
  { from: 'Motor Imagery', relationship: 'CONFOUNDED_BY', to: 'EMG contamination', evidence: 'established', note: 'Scalp/jaw EMG overlaps the mu band.' },
  { from: 'Motor Imagery', relationship: 'VALIDATED_BY', to: 'Session-level cross-validation', evidence: 'engineering-default' },
]

const motorImageryContext: ParadigmContext = {
  paradigmKey: 'motor-imagery',
  paradigmName: 'Motor Imagery',
  source: 'in-memory',
  modality: 'EEG',
  signals: miSignals,
  frequencyBands: miFreqBands,
  brainRegions: miRegions,
  electrodes: miElectrodes,
  hardware: miHardware,
  processingMethods: miProcessing,
  features: miFeatures,
  classifiers: miClassifiers,
  artifacts: miArtifacts,
  confounds: miConfounds,
  validationMethods: miValidation,
  datasets: miDatasets,
  reasoningPath: miReasoning,
}

// ---------------------------------------------------------------------------
// SSVEP
// ---------------------------------------------------------------------------

const ssvepSignals: NeuralSignalNode[] = [
  { key: 'ssvep-response', name: 'Steady-state visual evoked potential', label: 'NeuralSignal', description: 'Oscillatory response in visual cortex entrained to a flickering stimulus at a known frequency.' },
]

const ssvepFreqBands: FrequencyBandNode[] = [
  { key: 'ssvep-fundamental', name: 'SSVEP fundamental (stimulus frequency)', label: 'FrequencyBand', description: 'The driving frequency of the visual stimulus (commonly 6–30 Hz).' },
  { key: 'ssvep-harmonic', name: 'SSVEP harmonics', label: 'FrequencyBand', description: 'Integer multiples of the fundamental frequency that also carry classification information.' },
]

const ssvepRegions: BrainRegionNode[] = [
  { key: 'visual-cortex', name: 'Visual cortex (occipital)', label: 'BrainRegion', description: 'Primary and extrastriate visual areas in the occipital lobe.' },
]

const ssvepElectrodes: ElectrodeNode[] = [
  { key: 'Oz', name: 'Oz', label: 'Electrode', description: 'Midline occipital — strongest SSVEP amplitude.' },
  { key: 'O1', name: 'O1', label: 'Electrode', description: 'Left occipital — captures lateralised SSVEP.' },
  { key: 'O2', name: 'O2', label: 'Electrode', description: 'Right occipital — captures lateralised SSVEP.' },
  { key: 'Pz', name: 'Pz', label: 'Electrode', description: 'Midline parietal — secondary SSVEP pick-up.' },
]

const ssvepHardware: HardwareNode[] = [
  { key: 'openbci-cyton-ssvep', name: 'OpenBCI Cyton', label: 'Hardware', channels: 8, samplingRateHz: 250, notes: 'Sufficient for occipital SSVEP with proper electrode placement.' },
  { key: 'emotiv-epoc-x-ssvep', name: 'Emotiv EPOC X', label: 'Hardware', channels: 14, samplingRateHz: 256, notes: 'Has occipital channels; suitable for SSVEP prototyping.' },
]

const ssvepProcessing: ProcessingMethodNode[] = [
  { key: 'bandpass-ssvep', name: 'Band-pass filter (stimulus band + harmonics)', label: 'ProcessingMethod', stage: 1, description: 'Retain frequencies around stimulus and harmonics (e.g. 5–40 Hz).' },
  { key: 'epoching-ssvep', name: 'Epoching (gaze-period aligned)', label: 'ProcessingMethod', stage: 2, description: 'Segment data aligned to stimulus onset; typical epoch 2–5 s.' },
  { key: 'notch-ssvep', name: 'Notch filter (50/60 Hz)', label: 'ProcessingMethod', stage: 3, description: 'Remove mains interference that may alias into stimulus frequencies.' },
]

const ssvepFeatures: FeatureNode[] = [
  { key: 'cca', name: 'Canonical Correlation Analysis (CCA)', label: 'Feature', description: 'Correlates EEG with sine/cosine reference signals at each stimulus frequency.' },
  { key: 'psd-peak', name: 'PSD peak frequency', label: 'Feature', description: 'Power spectral density peak near each candidate stimulus frequency.' },
]

const ssvepClassifiers: ClassifierNode[] = [
  { key: 'cca-classifier', name: 'CCA-based classification', label: 'Classifier', description: 'Assign class to the stimulus frequency with highest canonical correlation.' },
  { key: 'fbcca', name: 'Filter-bank CCA (FBCCA)', label: 'Classifier', description: 'Applies CCA across multiple sub-bands for improved accuracy.' },
]

const ssvepArtifacts: ArtifactNode[] = [
  { key: 'blink-artifact', name: 'Blink / EOG artifact', label: 'Artifact', description: 'Eye blinks produce large frontal deflections that can leak into occipital channels.' },
]

const ssvepConfounds: ConfoundNode[] = [
  { key: 'visual-fatigue', name: 'Visual fatigue', label: 'Confound', description: 'Prolonged fixation on flickering stimuli causes discomfort and reduced SSVEP amplitude.' },
  { key: 'ssvep-frequency-overlap', name: 'Frequency overlap between targets', label: 'Confound', description: 'Stimulus frequencies too close together reduce classification separability.' },
  { key: 'ssvep-harmonic-aliasing', name: 'Harmonic aliasing', label: 'Confound', description: 'Stimulus harmonics may coincide with another target\'s fundamental frequency.' },
]

const ssvepValidation: ValidationMethodNode[] = [
  { key: 'cross-val-ssvep', name: 'Leave-one-trial-out cross-validation', label: 'ValidationMethod', description: 'Standard accuracy metric for SSVEP classification.' },
  { key: 'itr-ssvep', name: 'Information Transfer Rate (ITR)', label: 'ValidationMethod', description: 'Bits per minute metric combining accuracy, trial duration, and number of targets.' },
]

const ssvepDatasets: DatasetNode[] = [
  { key: 'benchmark-ssvep', name: 'Benchmark SSVEP Dataset (Wang et al. 2016)', label: 'Dataset', url: 'http://bci.med.tsinghua.edu.cn/download.html', modality: 'EEG', taskParadigm: '40-target SSVEP speller', synthetic: false, population: '35 subjects', format: 'MAT', useCases: ['SSVEP algorithm benchmarking', 'High-target BCI design'], limitations: ['Lab-controlled gaze', 'Healthy young adults only'], license: 'Academic use' },
]

const ssvepReasoning: ReasoningStep[] = [
  { from: 'SSVEP', relationship: 'USES_MODALITY', to: 'EEG', evidence: 'established', note: 'SSVEP is measured from occipital EEG.' },
  { from: 'SSVEP', relationship: 'ASSOCIATED_WITH', to: 'Steady-state visual evoked potential', evidence: 'established', note: 'The SSVEP response is entrained to the flicker frequency.' },
  { from: 'Steady-state visual evoked potential', relationship: 'MEASURED_AT', to: 'Oz', evidence: 'established', note: 'Oz captures the strongest midline occipital response.' },
  { from: 'SSVEP', relationship: 'EXTRACTED_BY', to: 'Canonical Correlation Analysis (CCA)', evidence: 'established', note: 'CCA is the standard reference-based detection method.' },
  { from: 'SSVEP', relationship: 'CLASSIFIED_BY', to: 'CCA-based classification', evidence: 'established' },
  { from: 'SSVEP', relationship: 'CONFOUNDED_BY', to: 'Visual fatigue', evidence: 'established' },
  { from: 'SSVEP', relationship: 'VALIDATED_BY', to: 'Information Transfer Rate (ITR)', evidence: 'engineering-default' },
]

const ssvepContext: ParadigmContext = {
  paradigmKey: 'ssvep',
  paradigmName: 'SSVEP',
  source: 'in-memory',
  modality: 'EEG',
  signals: ssvepSignals,
  frequencyBands: ssvepFreqBands,
  brainRegions: ssvepRegions,
  electrodes: ssvepElectrodes,
  hardware: ssvepHardware,
  processingMethods: ssvepProcessing,
  features: ssvepFeatures,
  classifiers: ssvepClassifiers,
  artifacts: ssvepArtifacts,
  confounds: ssvepConfounds,
  validationMethods: ssvepValidation,
  datasets: ssvepDatasets,
  reasoningPath: ssvepReasoning,
}

// ---------------------------------------------------------------------------
// Meditation / Alpha Exploration
// ---------------------------------------------------------------------------

const medSignals: NeuralSignalNode[] = [
  { key: 'alpha-rhythm', name: 'Posterior alpha rhythm (8–12 Hz)', label: 'NeuralSignal', description: 'Alpha oscillations prominent over occipito-parietal cortex, modulated by eye closure and attentional state.' },
]

const medFreqBands: FrequencyBandNode[] = [
  { key: 'alpha-band', name: 'Alpha (8–12 Hz)', label: 'FrequencyBand', lowHz: 8, highHz: 12 },
  { key: 'theta-band', name: 'Theta (4–8 Hz)', label: 'FrequencyBand', lowHz: 4, highHz: 8 },
]

const medRegions: BrainRegionNode[] = [
  { key: 'posterior-cortex', name: 'Posterior cortex (occipito-parietal)', label: 'BrainRegion', description: 'Region where alpha amplitude is maximal during eyes-closed rest.' },
  { key: 'frontal-midline', name: 'Frontal midline', label: 'BrainRegion', description: 'Source of frontal midline theta associated with focused attention.' },
]

const medElectrodes: ElectrodeNode[] = [
  { key: 'Oz-med', name: 'Oz', label: 'Electrode', description: 'Midline occipital — strongest posterior alpha.' },
  { key: 'Pz-med', name: 'Pz', label: 'Electrode', description: 'Midline parietal — posterior alpha and possible frontal theta reference.' },
  { key: 'Fz-med', name: 'Fz', label: 'Electrode', description: 'Midline frontal — frontal midline theta.' },
]

const medHardware: HardwareNode[] = [
  { key: 'muse-headband', name: 'Muse headband', label: 'Hardware', channels: 4, samplingRateHz: 256, notes: 'Consumer meditation headset with frontal and ear-reference electrodes; limited spatial resolution.' },
  { key: 'openbci-cyton-med', name: 'OpenBCI Cyton', label: 'Hardware', channels: 8, samplingRateHz: 250, notes: 'More flexible electrode placement for exploratory alpha/theta recording.' },
]

const medProcessing: ProcessingMethodNode[] = [
  { key: 'bandpass-med', name: 'Band-pass filter (4–30 Hz)', label: 'ProcessingMethod', stage: 1, description: 'Retain theta through beta for meditation-related spectral analysis.' },
  { key: 'artifact-rejection-med', name: 'Artifact rejection', label: 'ProcessingMethod', stage: 2, description: 'Remove movement and blink artifacts; preserve long clean segments for spectral estimation.' },
  { key: 'psd-estimation', name: 'Power spectral density estimation (Welch)', label: 'ProcessingMethod', stage: 3, description: 'Compute PSD in sliding windows to track alpha power over time.' },
]

const medFeatures: FeatureNode[] = [
  { key: 'alpha-power', name: 'Alpha band power', label: 'Feature', description: 'Mean PSD in 8–12 Hz band — the primary exploratory marker.' },
  { key: 'alpha-theta-ratio', name: 'Alpha/theta power ratio', label: 'Feature', description: 'Ratio of alpha to theta power; sometimes used as an exploratory meditation index.' },
]

const medClassifiers: ClassifierNode[] = [
  { key: 'threshold-med', name: 'Threshold-based detection', label: 'Classifier', description: 'Simple alpha-power threshold to flag high-alpha periods; not a meditation classifier per se.' },
]

const medArtifacts: ArtifactNode[] = [
  { key: 'movement-artifact', name: 'Movement artifact', label: 'Artifact', description: 'Head or body movement during meditation sessions contaminates EEG.' },
  { key: 'eog-med', name: 'EOG / blink artifact', label: 'Artifact', description: 'Slow eye movements and blinks produce frontal low-frequency deflections.' },
]

const medConfounds: ConfoundNode[] = [
  { key: 'eye-state-confound', name: 'Eye state (open vs. closed)', label: 'Confound', description: 'Posterior alpha increases dramatically with eye closure alone. An eyes-closed rest condition will show high alpha even without meditation. This is the most critical confound for alpha-based meditation claims.' },
  { key: 'drowsiness-confound', name: 'Drowsiness / sleep onset', label: 'Confound', description: 'Alpha slowing and theta emergence can reflect drowsiness rather than meditation.' },
  { key: 'alpha-not-meditation', name: 'Alpha ≠ meditation', label: 'Confound', description: 'Alpha activity reflects many processes (idling, attention disengagement, eye closure). It is not a specific marker of meditative state.' },
]

const medValidation: ValidationMethodNode[] = [
  { key: 'within-subject-comparison', name: 'Within-subject eyes-open vs. eyes-closed comparison', label: 'ValidationMethod', description: 'Compare alpha power across controlled conditions to isolate meditation effects from eye-state effects.' },
  { key: 'effect-size-reporting', name: 'Effect-size reporting', label: 'ValidationMethod', description: 'Report Cohen\'s d or similar; avoid over-interpreting small effects.' },
]

const medDatasets: DatasetNode[] = [
  { key: 'meditation-eeg-sample', name: 'OpenNeuro Meditation EEG (sample)', label: 'Dataset', url: 'https://openneuro.org/datasets/ds004359', modality: 'EEG', taskParadigm: 'Focused-attention meditation vs. rest', synthetic: false, population: '18 subjects', format: 'BIDS', useCases: ['Exploratory meditation EEG analysis'], limitations: ['Heterogeneous meditation experience', 'Single session'], license: 'CC0' },
]

const medReasoning: ReasoningStep[] = [
  { from: 'Meditation / Alpha Exploration', relationship: 'USES_MODALITY', to: 'EEG', evidence: 'established' },
  { from: 'Meditation / Alpha Exploration', relationship: 'INVESTIGATES', to: 'Posterior alpha rhythm (8–12 Hz)', evidence: 'exploratory', note: 'Alpha is investigated as a possible correlate, not a definitive marker.' },
  { from: 'Posterior alpha rhythm (8–12 Hz)', relationship: 'MEASURED_AT', to: 'Oz', evidence: 'established' },
  { from: 'Posterior alpha rhythm (8–12 Hz)', relationship: 'MEASURED_AT', to: 'Pz', evidence: 'established' },
  { from: 'Posterior alpha rhythm (8–12 Hz)', relationship: 'AFFECTS', to: 'Eye state (open vs. closed)', evidence: 'established', note: 'Alpha amplitude is strongly modulated by eye state — a critical confound.' },
  { from: 'Meditation / Alpha Exploration', relationship: 'EXTRACTED_BY', to: 'Alpha band power', evidence: 'engineering-default' },
  { from: 'Meditation / Alpha Exploration', relationship: 'CONFOUNDED_BY', to: 'Alpha ≠ meditation', evidence: 'established', note: 'Alpha activity alone does not prove meditative state.' },
  { from: 'Meditation / Alpha Exploration', relationship: 'VALIDATED_BY', to: 'Within-subject eyes-open vs. eyes-closed comparison', evidence: 'engineering-default' },
]

const meditationContext: ParadigmContext = {
  paradigmKey: 'meditation-alpha',
  paradigmName: 'Meditation / Alpha Exploration',
  source: 'in-memory',
  modality: 'EEG',
  signals: medSignals,
  frequencyBands: medFreqBands,
  brainRegions: medRegions,
  electrodes: medElectrodes,
  hardware: medHardware,
  processingMethods: medProcessing,
  features: medFeatures,
  classifiers: medClassifiers,
  artifacts: medArtifacts,
  confounds: medConfounds,
  validationMethods: medValidation,
  datasets: medDatasets,
  reasoningPath: medReasoning,
}

// ---------------------------------------------------------------------------
// Lookup map
// ---------------------------------------------------------------------------

const CONTEXT_MAP: Record<string, ParadigmContext> = {
  'motor-imagery': motorImageryContext,
  'ssvep': ssvepContext,
  'meditation-alpha': meditationContext,
}

/**
 * Return the in-memory `ParadigmContext` for a supported paradigm.
 * Used as the fallback when Neo4j is unavailable.
 */
export function getInMemoryContext(paradigmKey: string): ParadigmContext | null {
  return CONTEXT_MAP[paradigmKey] ?? null
}
