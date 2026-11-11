/** Advertised features and evaluated JSON compatibility are intentionally separate. */
import { z } from 'zod'
import { outputModes, type OutputMode } from '@/lib/schemas/provider'
import type { ModelFamily } from './discovery'
import { ModelProviderError } from './errors'

export interface ModelProfile {
  outputMode: OutputMode
  tokenParameter: 'max_tokens' | 'max_completion_tokens'
  maxOutputTokens: number
  temperature: number | null
  source: 'conservative' | 'documented-direct' | 'operator-configured'
}
const overrideSchema = z.object({
  model: z.string().min(1),
  outputMode: z.enum(outputModes).optional(),
  verifiedOutputModes: z.array(z.enum(['json_object', 'json_schema'])).optional(),
  tokenParameter: z.enum(['max_tokens', 'max_completion_tokens']).optional(),
  maxOutputTokens: z.number().int().min(256).max(32768).optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
}).strict()

export function resolveProfile(params: {
  provider: 'mia21' | 'openai'; model: string; requestedModel: string; family: ModelFamily
  override?: string; maxOutputTokens?: number | null
}): ModelProfile {
  const bare = params.model.split('/').pop() || params.model
  const reasoning = params.family === 'gpt' && /^(?:o[134](?:-|$)|gpt-[5-9](?:[.-]|$))/.test(bare)
  const documentedJSON = params.provider === 'openai' && /^(?:gpt-4o|gpt-4\.1|gpt-[5-9])(?:[.-]|$)/.test(bare)
  let profile: ModelProfile = {
    outputMode: documentedJSON ? 'json_object' : 'prompt',
    tokenParameter: reasoning ? 'max_completion_tokens' : 'max_tokens',
    maxOutputTokens: 4096,
    temperature: params.provider === 'openai' && !reasoning ? 0.3 : null,
    source: documentedJSON ? 'documented-direct' : 'conservative',
  }
  if (params.override) {
    let raw: unknown
    try { raw = JSON.parse(params.override) } catch { throw new ModelProviderError('provider_configuration') }
    const result = overrideSchema.safeParse(raw)
    if (!result.success) throw new ModelProviderError('provider_configuration')
    const override = result.data
    if (override.model !== params.model && override.model !== params.requestedModel) throw new ModelProviderError('provider_configuration')
    if (override.outputMode && override.outputMode !== 'prompt' && !(documentedJSON && override.outputMode === 'json_object') && !override.verifiedOutputModes?.includes(override.outputMode)) throw new ModelProviderError('provider_configuration')
    profile = {
      ...profile,
      ...(override.outputMode ? { outputMode: override.outputMode } : {}),
      ...(override.tokenParameter ? { tokenParameter: override.tokenParameter } : {}),
      ...(override.maxOutputTokens !== undefined ? { maxOutputTokens: override.maxOutputTokens } : {}),
      ...(override.temperature !== undefined ? { temperature: override.temperature } : {}),
      source: 'operator-configured',
    }
  }
  if (params.maxOutputTokens) profile.maxOutputTokens = Math.min(profile.maxOutputTokens, params.maxOutputTokens)
  return profile
}
