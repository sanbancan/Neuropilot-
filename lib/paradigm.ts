/**
 * Deterministic paradigm classifier for NeuroPilot.
 *
 * Uses keyword scoring to map a free-text BCI goal to one of the supported
 * paradigms without requiring an LLM call.  The classifier is intentionally
 * simple and fast — obvious requests are handled here so the LLM is only
 * invoked for plan synthesis, not classification.
 */

import type { ParadigmKey } from '@/lib/graph/types'

export interface ParadigmDetection {
  /** Matched paradigm, or `null` when no supported paradigm scored above threshold. */
  paradigm: ParadigmKey | null
  /** Normalised confidence in [0, 1]. */
  confidence: number
  /** Short human-readable interpretation of what the detector understood. */
  interpretation?: string
}

// ---------------------------------------------------------------------------
// Keyword / phrase dictionaries
// ---------------------------------------------------------------------------

interface PhraseEntry {
  phrases: string[]
  weight: number
}

const PARADIGM_PHRASES: Record<ParadigmKey, PhraseEntry> = {
  'motor-imagery': {
    phrases: [
      'motor imagery',
      'imagined movement',
      'imagined hand movement',
      'imagine moving',
      'left hand vs right hand',
      'left hand right hand',
      'left-hand right-hand',
      'left vs right',
      'movement imagination',
      'imagine clenching',
      'imagine grasping',
      'hand movement',
      'motor imagination',
      'sensorimotor',
      'kinesthetic imagery',
      'mu rhythm',
      'event-related desynchronisation',
      'event-related desynchronization',
      'ERD',
    ],
    weight: 1.0,
  },
  'ssvep': {
    phrases: [
      'ssvep',
      'steady-state visual',
      'flashing target',
      'visual flicker',
      'flickering stimulus',
      'flickering stimuli',
      'visual selection',
      'stimulus frequency',
      'visual evoked potential',
      'flicker frequency',
      'gaze selection',
      'p300 speller',
      'visual speller',
      'flashing visual',
    ],
    weight: 1.0,
  },
  'meditation-alpha': {
    phrases: [
      'meditation',
      'meditative state',
      'meditative',
      'relaxation eeg',
      'alpha meditation',
      'alpha relaxation',
      'mindfulness',
      'focused attention',
      'open monitoring',
      'resting state',
      'eyes closed rest',
      'alpha power',
      'meditation changes eeg',
      'calm state',
      'relaxation',
    ],
    weight: 1.0,
  },
}

/** Minimum normalised score to accept a classification. */
const CONFIDENCE_THRESHOLD = 0.15

// ---------------------------------------------------------------------------
// Detector
// ---------------------------------------------------------------------------

/**
 * Detect the closest supported paradigm from a user's BCI goal text.
 *
 * Returns `{ paradigm: null }` when no paradigm scores above the threshold,
 * signalling that the request is unsupported.
 */
export function detectParadigm(goal: string): ParadigmDetection {
  const lower = goal.toLowerCase()

  let bestKey: ParadigmKey | null = null
  let bestScore = 0
  let bestInterpretation: string | undefined

  for (const [key, entry] of Object.entries(PARADIGM_PHRASES) as [ParadigmKey, PhraseEntry][]) {
    let score = 0
    const matched: string[] = []

    for (const phrase of entry.phrases) {
      if (lower.includes(phrase)) {
        // Longer phrases are more specific — give them more weight.
        score += phrase.length * entry.weight
        matched.push(phrase)
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestKey = key
      bestInterpretation = matched.length > 0
        ? `Matched: ${matched.join(', ')}`
        : undefined
    }
  }

  // Normalise: divide by a reasonable max (longest possible phrase match weight)
  // Use a soft cap so scores are comparable across paradigms.
  const maxPossible = 120 // approximate max single-paradigm score
  const confidence = Math.min(bestScore / maxPossible, 1)

  if (bestScore === 0 || confidence < CONFIDENCE_THRESHOLD) {
    return { paradigm: null, confidence: 0 }
  }

  return {
    paradigm: bestKey,
    confidence,
    interpretation: bestInterpretation,
  }
}
