import { designResponseSchema } from '@/lib/schemas/design'
import type { DesignRequest, DesignResponse } from '@/types/neuropilot'

/**
 * Frontend development fixture — a deterministic motor-imagery plan in the
 * exact shared DesignResponse shape, parsed through the shared Zod contract
 * so it can never drift from what POST /api/design will return.
 *
 * Remove this module (and its call site in app/page.tsx) once the backend
 * endpoint is live.
 */

const MOTOR_IMAGERY_RESPONSE: DesignResponse = designResponseSchema.parse({
  meta: {
    paradigmKey: 'motor-imagery',
    graphSource: 'in-memory',
    generator: 'fallback',
    model: null,
    generatedAt: '2026-09-12T09:00:00.000Z',
  },

  plan: {
    title: 'Motor-Imagery BCI — Imagined Left vs. Right Hand',
    summary:
      'A two-class, cued motor-imagery prototype: band-pass filtered EEG over the sensorimotor cortex is spatially filtered with CSP, reduced to mu/beta log-band-power features, and classified with LDA, evaluated on fully held-out runs. This is the classical benchmark pipeline for imagined-movement discrimination and a realistic first BCI to build.',

    paradigm: {
      name: 'Motor Imagery',
      reason:
        'Your objective — separating imagined left-hand from imagined right-hand movement — is the canonical motor-imagery BCI task. The knowledge graph links motor imagery to mu and beta rhythm modulation over the sensorimotor cortex, measured at central electrodes.',
    },

    modality: 'EEG',

    neuralTarget: {
      signals: ['Mu rhythm (8–12 Hz)', 'Beta rhythm (13–30 Hz)'],
      brainRegions: ['Sensorimotor cortex (hand representation area)'],
      reason:
        'Unilateral motor imagery desynchronizes mu and beta oscillations over the contralateral hand area of the sensorimotor cortex (the ERD/ERS effect). Left and right imagery therefore leave distinguishable signatures at C3 versus C4.',
    },

    electrodes: {
      recommended: ['C3', 'Cz', 'C4'],
      reason:
        'C3 and C4 sit over the left and right hand areas of the sensorimotor cortex, and Cz is a useful midline channel that also fits a small 8-channel budget.',
    },

    hardware: {
      requirements: [
        'An EEG amplifier with at least 3–8 scalp channels around C3 / Cz / C4 (e.g. an OpenBCI Cyton with a 10-20 cap or dry-electrode headband)',
        'Reference and ground electrodes (ear/mastoid or standard cap positions)',
        'Gel or saline depending on electrode type, with a way to check impedances before recording',
        'A screen for cue presentation plus event logging (PsychoPy, LabRecorder, or a custom script)',
      ],
      reason:
        'Motor imagery rewards electrode placement over channel count: a small, clean montage over the central strip outperforms a larger noisy one. If you already own an OpenBCI Cyton or similar device, you already have what you need.',
    },

    sampling: {
      recommendation: '≥ 250 Hz (200–500 Hz is typical for this paradigm)',
      reason:
        'Mu and beta activity lives below ~30 Hz, so Nyquist is easily satisfied; the extra headroom makes anti-aliasing, 50/60 Hz line-noise removal, and artifact detection more robust.',
    },

    protocol: [
      {
        title: 'Screening session',
        detail:
          'Record roughly 20 trials per class first. Not every user produces detectable mu/beta modulation, so confirm the effect exists before investing in a full experiment.',
      },
      {
        title: 'Session structure',
        detail:
          'Record 4–6 runs of 40–60 cued trials (20–30 per class), interleaving left and right imagery in a balanced, randomized order.',
      },
      {
        title: 'Trial timing',
        detail:
          'Each trial: fixation cross (1–2 s) → directional cue (0.5 s) → imagery period (3–4 s) → rest with a jittered inter-trial interval.',
      },
      {
        title: 'Imagery instructions',
        detail:
          'Ask the user to imagine one concrete, repeated action per hand (e.g. squeezing a ball) using first-person kinesthetic imagery, kept identical across trials.',
      },
      {
        title: 'Prevent actual movement',
        detail:
          'Remind the user to stay relaxed and to imagine rather than execute movement; watch for muscle activity during the session.',
      },
      {
        title: 'Breaks and fatigue',
        detail:
          'Insert breaks between runs. Motor-imagery performance degrades with fatigue, and tired users start moving instead of imagining.',
      },
      {
        title: 'Event logging',
        detail: 'Log every cue, trial, break, and irregularity so epochs can be cut and audited offline.',
      },
    ],

    pipeline: [
      {
        title: 'EEG acquisition',
        detail:
          'Record from C3 / Cz / C4 (plus any available neighbors) with a common reference and low impedances.',
      },
      {
        title: 'Band-pass filtering',
        detail:
          'Filter to roughly 7–30 Hz to isolate mu and beta while removing drift; apply a 50/60 Hz notch if needed.',
      },
      {
        title: 'Epoching',
        detail: 'Cut trial-locked epochs (e.g. 0.5–2.5 s after the cue) and discard the rest periods.',
      },
      {
        title: 'Artifact handling',
        detail:
          'Reject or repair epochs contaminated by movement, EMG, or eye artifacts, using identical criteria for both classes.',
      },
      {
        title: 'CSP',
        detail:
          'Common Spatial Patterns learns spatial filters that maximize the variance difference between the two imagery classes.',
      },
      {
        title: 'LDA',
        detail: 'Linear Discriminant Analysis on CSP log-variance features produces the two-class decision.',
      },
      {
        title: 'Prediction',
        detail:
          'Classify held-out epochs and report accuracy with a confidence interval rather than a single number.',
      },
    ],

    features: [
      'CSP-filtered log-band-power in mu (8–12 Hz) and beta (13–30 Hz) — the bands that reliably modulate with imagined movement (ERD/ERS).',
      'Contralateral power asymmetry between C3 and C4 — directly captures the left-vs-right separation the classifier needs.',
      'Individual mu peak frequency as a per-user reference — peak frequency varies between people and sharpens band-power estimates.',
      'Per-trial variance of CSP components — a cheap sanity feature for spotting contaminated trials.',
    ],

    classifier: {
      name: 'LDA on CSP features',
      reason:
        'With a few hundred training trials, LDA is the standard motor-imagery choice: low variance, no hyperparameter tuning, and strong published baselines. CSP + LDA is the classical BCI benchmark pipeline.',
    },

    validation: [
      'Split by run into training and held-out sets so the classifier is never tested on trials it saw during training; hold out at least one full run.',
      'Report accuracy with a confidence interval and compare it against the 50% chance level for this two-class problem.',
      'If data span multiple days, evaluate across sessions — within-session accuracy overstates real BCI usability.',
      'Optionally run shuffled-label permutation tests to confirm the pipeline cannot reach the same accuracy on random labels.',
    ],

    confounds: [
      {
        name: 'Actual movement',
        detail:
          'Executed hand movement produces a much stronger, more focal signal than imagined movement. A classifier can quietly learn to detect small executed movements instead of motor imagery, inflating offline accuracy.',
        mitigation:
          'Instruct the user to imagine only, monitor for movement during the session, and compare results in blocks where movement is explicitly prevented.',
      },
      {
        name: 'EMG contamination',
        detail:
          'Neck, jaw, or forearm muscle activity overlaps the EEG frequency range and can masquerade as class-discriminative "signal".',
        mitigation:
          'Keep the user relaxed, inspect epochs for high-amplitude high-frequency bursts, and consider EMG channels or ICA to quantify contamination.',
      },
      {
        name: 'Eye artifacts',
        detail:
          'Blinks and eye movements add large transients that, with few channels, can leak into CSP filters.',
        mitigation:
          'Have the user fixate on the cue cross, reject high-variance frontal epochs, and apply identical rejection criteria to both classes.',
      },
      {
        name: 'Movement artifacts',
        detail:
          'Head, cable, and electrode movements produce slow drifts that can correlate with trial timing if the user tenses at every cue.',
        mitigation:
          'Seat the user comfortably, secure cables, and reject drift-contaminated epochs identically across classes so artifacts cannot become the class cue.',
      },
    ],

    assumptions: [
      'The user is among the majority of people who produce detectable mu/beta modulation during motor imagery — this must be verified in the screening session, not assumed.',
      'Imagined movements of the two hands produce distinguishable, roughly contralateral modulation patterns in this user.',
      'A few hundred trials are enough to train stable CSP filters and an LDA for a lab-style demonstration.',
      'The user has, or will obtain, an EEG device with at least three usable channels around C3 / Cz / C4.',
    ],

    limitations: [
      'Offline accuracy is not online performance: a real-time BCI adds latency, electrode drift, and nonstationarity between sessions.',
      'This plan describes a supervised, cued experiment — a first prototype, not a deployable BCI.',
      'NeuroPilot cannot guarantee any accuracy; motor-imagery performance varies widely across users ("BCI illiteracy" affects a substantial minority).',
      'With very few channels, spatial filtering is limited, so expect lower accuracy than full-cap CSP results.',
    ],

    reasoningPath: [
      { from: 'Motor Imagery', relationship: 'ASSOCIATED_WITH', to: 'Mu Rhythm', evidence: 'established' },
      { from: 'Mu Rhythm', relationship: 'ASSOCIATED_WITH', to: 'Sensorimotor Cortex', evidence: 'established' },
      { from: 'Sensorimotor Cortex', relationship: 'MEASURED_AT', to: 'C3 / Cz / C4', evidence: 'established' },
      { from: 'Mu Rhythm', relationship: 'HAS_FREQUENCY', to: '8–12 Hz band', evidence: 'established' },
      { from: 'Motor Imagery', relationship: 'ASSOCIATED_WITH', to: 'Beta Band Modulation', evidence: 'established' },
      { from: 'Motor Imagery', relationship: 'PROCESSED_BY', to: 'Band-pass Filtering + Epoching', evidence: 'established' },
      { from: 'Motor Imagery', relationship: 'EXTRACTED_BY', to: 'CSP', evidence: 'established' },
      { from: 'CSP', relationship: 'CLASSIFIED_BY', to: 'LDA', evidence: 'established' },
      { from: 'Motor Imagery', relationship: 'VALIDATED_BY', to: 'Held-out Validation', evidence: 'established' },
      {
        from: 'Motor Imagery',
        relationship: 'CONFOUNDED_BY',
        to: 'Actual Movement / EMG',
        evidence: 'established',
        note: 'Executed movement and muscle activity can mimic or drown out the imagined-movement signal.',
      },
    ],

    relevantDatasets: [],
  },
})

export async function designBci(request: DesignRequest): Promise<DesignResponse> {
  // Frontend mock: returns the deterministic motor-imagery fixture for any
  // valid request. The request parameter is intentionally unused until the
  // real endpoint lands.
  //
  // Swap point for the real backend — replace the two lines below with:
  //
  //   const response = await fetch('/api/design', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(request),
  //   })
  //   if (!response.ok) throw new Error(`Design failed (${response.status})`)
  //   return designResponseSchema.parse(await response.json())
  //
  void request
  return MOTOR_IMAGERY_RESPONSE
}
