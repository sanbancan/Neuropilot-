import { emptyRequirements, technicalRequirementsSchema, type TechnicalRequirements } from '@/lib/schemas/knowledge'
import type { DesignRequest } from '@/lib/schemas/design'

/** Only explicit structured inputs or conservative literal extraction become technical constraints. */
export function resolveRequirements(request: Pick<DesignRequest, 'goal' | 'hardware' | 'constraints' | 'requirements'>): { requirements: TechnicalRequirements; conflicts: string[] } {
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, sixteen: 16 }
  const text = `${request.goal}\n${request.hardware || ''}\n${request.constraints || ''}`.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|sixteen)\s+(?=(?:eeg\s*)?channels?\b)/gi, word => `${words[word.trim().toLowerCase()]} `)
  const requirements = { ...emptyRequirements, electrodeSites: [], ...request.requirements }
  const conflicts: string[] = []
  function extract(pattern: RegExp, field: 'availableChannels' | 'requiredChannels' | 'samplingRateHz', withUnits = false) {
    const values = [...new Set([...text.matchAll(pattern)].map(match => Number(match[1]) * (withUnits && match[2]?.toLowerCase() === 'khz' ? 1000 : 1)))]
    if (requirements[field] !== null) values.push(requirements[field]!)
    const unique = [...new Set(values)]
    if (unique.length > 1) conflicts.push(`Conflicting explicit values for ${field}: ${unique.join(', ')}.`)
    if (unique.length === 1) requirements[field] = unique[0]
  }
  extract(/(?:only|have|available|limited to)\s+(\d+)\s*(?:eeg\s*)?channels?/gi, 'availableChannels')
  extract(/(?:need|require|at least|minimum of)\s+(\d+)\s*(?:eeg\s*)?channels?/gi, 'requiredChannels')
  extract(/(?:sampling(?: rate)?(?: of| at)?|sample at|record at)\s+(\d+(?:\.\d+)?)\s*(k?hz)/gi, 'samplingRateHz', true)
  if (!requirements.deploymentTarget) {
    const target = text.match(/\b(embedded|desktop|mobile|offline|real time)\b/i)
    if (target) requirements.deploymentTarget = target[0]
  }
  if (requirements.availableChannels !== null && requirements.requiredChannels !== null && requirements.requiredChannels > requirements.availableChannels) {
    conflicts.push(`Required ${requirements.requiredChannels} channels exceeds the stated ${requirements.availableChannels} available channels.`)
  }
  if (requirements.availableChannels !== null && requirements.electrodeSites.length > requirements.availableChannels) {
    conflicts.push('Requested electrode count exceeds the available recording channels.')
  }
  const validated = technicalRequirementsSchema.safeParse(requirements)
  if (!validated.success) conflicts.push('Explicit technical requirements exceed supported numeric or format bounds; please clarify them.')
  return { requirements, conflicts }
}

/** Literal modality constraints override model guesses; conflicts remain explicit. */
export function resolveModality(request: Pick<DesignRequest, 'goal' | 'modality' | 'hardware' | 'constraints'>, interpreted: string): { modality: string; conflicts: string[] } {
  const text = `${request.goal} ${request.hardware || ''} ${request.constraints || ''}`.replace(/\b(?:not|without|avoid)\s+(?:using\s+)?(?:EEG|fNIRS)/gi, '')
  const fnirs = /fnirs|near[- ]infrared/i.test(text)
  const eeg = /\beeg\b/i.test(text)
  const exclusive = /(?:fnirs|near[- ]infrared)(?:[- ]only| only)|only (?:have |use |using )?fnirs/i.test(text) ? 'fNIRS'
    : /eeg(?:[- ]only| only)|only (?:have |use |using )?eeg/i.test(text) ? 'EEG' : null
  const literal = exclusive || (fnirs && !eeg ? 'fNIRS' : eeg && !fnirs ? 'EEG' : null)
  if (request.modality !== 'unknown' && literal && request.modality !== literal) return { modality: literal, conflicts: ['The selected modality conflicts with the explicitly described recording modality.'] }
  return { modality: request.modality !== 'unknown' ? request.modality : literal || interpreted, conflicts: [] }
}
