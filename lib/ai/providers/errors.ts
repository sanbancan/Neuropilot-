import type { ProviderErrorCode } from '@/lib/schemas/provider'

const MESSAGES: Record<ProviderErrorCode, string> = {
  provider_configuration: 'AI provider configuration is missing, invalid, or incompatible with the selected model.',
  model_unavailable: 'The configured model is unavailable or ambiguous in the provider catalog. No alternative model was selected.',
  discovery_failed: 'Mia21 model discovery failed. No model request or automatic provider switch was made.',
  provider_authentication: 'The selected AI provider rejected its credentials. No automatic provider switch was made.',
  provider_rate_limit: 'The selected AI provider is rate limited or its quota is exhausted.',
  provider_unavailable: 'The selected AI provider is unavailable. No automatic provider switch was made.',
  provider_bad_request: 'The selected AI provider rejected the request or model parameters. No settings were silently changed.',
  provider_response: 'The selected AI provider returned an unsupported response. No tools were executed.',
}
export class ModelProviderError extends Error {
  constructor(readonly code: ProviderErrorCode) { super(MESSAGES[code]); this.name = 'ModelProviderError' }
}
