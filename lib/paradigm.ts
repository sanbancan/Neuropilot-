/** Offline hints only. Model interpretation is not gated on these expressions. */
import type { ObjectiveInterpretation } from '@/lib/schemas/knowledge'

export function explicitParadigmNames(goal: string): ('p300' | 'ssvep')[] {
  const names: ('p300' | 'ssvep')[] = []
  for (const match of goal.matchAll(/\bp300\b|\bssvep\b/gi)) {
    const before = goal.slice(0, match.index).slice(-40)
    if (/(?:not|without|avoid|instead of|rather than)\s+(?:using\s+)?$/i.test(before)) continue
    const name = match[0].toLowerCase() as 'p300' | 'ssvep'
    if (!names.includes(name)) names.push(name)
  }
  return names
}

export function objectiveHints(goal: string): ObjectiveInterpretation {
  const text = goal.toLowerCase().replace(/[-_]/g, ' ').replace(/\b(?:no|not|without|avoid|instead of|rather than)\s+(?:using\s+)?(?:p300|ssvep|flicker(?:ing)?)/g, '')
  const candidates: ObjectiveInterpretation['candidates'] = []
  if (/motor imagery|imagin\w* (?:\w+\s){0,5}(?:mov|hand|fist)|kinesthetic|left hand.*right hand/.test(text)) candidates.push('motor-imagery')
  if (/\bp300\b|\bp3 speller\b|oddball|rare target|infrequent.*target|event related potential/.test(text)) candidates.push('p300')
  if (/\bssvep\b|steady state visual|flicker|different frequencies|frequency tagged/.test(text)) candidates.push('ssvep')
  if (/meditat|mindful|alpha (?:power|activity|rhythm)|relaxation/.test(text)) candidates.push('meditation-alpha')
  const paradigm = candidates.length === 1 ? candidates[0] : 'unknown'
  return {
    summary: goal,
    paradigm,
    candidates,
    modality: /fnirs|near infrared/.test(text) ? 'fNIRS' : /\beeg\b/.test(text) ? 'EEG' : 'unknown',
    questions: candidates.length > 1
      ? ['Which paradigm should this design use? Your objective mentions multiple approaches.']
      : candidates.length === 0 ? ['What task should the BCI perform, and which neural response or interaction would you like to investigate?'] : [],
  }
}

/** Compatibility helper for callers needing a hint, never a request rejection. */
export function detectParadigm(goal: string) {
  const hint = objectiveHints(goal)
  return { paradigm: hint.paradigm === 'unknown' || hint.paradigm === 'other' ? null : hint.paradigm,
    confidence: hint.candidates.length === 1 ? 0.5 : 0, interpretation: hint.summary }
}
