import { z } from 'zod'

export const PROVIDER_ERROR_CODES = [
  'provider_configuration', 'model_unavailable', 'discovery_failed',
  'provider_authentication', 'provider_rate_limit', 'provider_unavailable',
  'provider_bad_request', 'provider_response',
] as const
export type ProviderErrorCode = (typeof PROVIDER_ERROR_CODES)[number]
export const outputModes = ['prompt', 'json_object', 'json_schema'] as const
export type OutputMode = (typeof outputModes)[number]
export const modelCapabilitiesSchema = z.object({
  tools: z.boolean().nullable(), streaming: z.boolean().nullable(),
  webSearch: z.boolean().nullable(), vision: z.boolean().nullable(), documents: z.boolean().nullable(),
})
export type ModelCapabilities = z.infer<typeof modelCapabilitiesSchema>
export const providerMetadataSchema = z.object({
  name: z.enum(['mia21', 'openai']),
  model: z.string(), family: z.enum(['gpt', 'claude', 'gemini']),
  outputMode: z.enum(outputModes),
  profileSource: z.enum(['conservative', 'documented-direct', 'operator-configured']),
  discovery: z.enum(['live', 'cached', 'not-required']),
  capabilities: modelCapabilitiesSchema,
  memory: z.literal('disabled'), toolExecution: z.literal('disabled'),
  liveEvaluated: z.literal(false),
})
export type ProviderMetadata = z.infer<typeof providerMetadataSchema>
