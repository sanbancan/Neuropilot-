/** Server-side selection only. Never fall through from Mia21 to a different provider. */
import OpenAI from 'openai'
import type { PlanModel } from '../model'
import { createChatCompletionsModel } from './chat-completions'
import { mia21Discovery, selectDiscoveredModel, type ModelDiscovery } from './discovery'
import { resolveProfile } from './profiles'
import { ModelProviderError } from './errors'

export const MIA21_BASE_URL = 'https://api.mia21.com/v1'
export const OPENAI_BASE_URL = 'https://api.openai.com/v1'
type Environment = Record<string, string | undefined>

export async function getConfiguredModel(options: { env?: Environment; discovery?: ModelDiscovery; fetch?: typeof fetch } = {}): Promise<PlanModel | null> {
  const env = options.env || process.env
  const provider = env.AI_PROVIDER?.trim() || 'openai'
  if (provider !== 'mia21' && provider !== 'openai') throw new ModelProviderError('provider_configuration')
  const apiKey = provider === 'mia21' ? env.MIA21_API_KEY : env.OPENAI_API_KEY
  if (!apiKey?.trim()) {
    // Preserve no-key demo mode for direct OpenAI. Explicit Mia21 configuration must not silently become a demo.
    if (provider === 'mia21') throw new ModelProviderError('provider_configuration')
    return null
  }
  const requested = (env.AI_MODEL || (provider === 'openai' ? env.OPENAI_MODEL || 'gpt-4o-mini' : '')).trim()
  if (!requested || !/^[a-zA-Z0-9][a-zA-Z0-9._:/+-]{0,199}$/.test(requested)) throw new ModelProviderError('provider_configuration')
  const catalog = provider === 'mia21' ? await (options.discovery || mia21Discovery).list() : null
  const selected = catalog ? selectDiscoveredModel(catalog.models, requested) : null
  const model = selected?.id || requested.replace(/^openai\//, '')
  if (provider === 'openai' && (/\//.test(model) || /^(claude|gemini)/i.test(model))) throw new ModelProviderError('provider_configuration')
  const family = selected?.family || 'gpt'
  const profile = resolveProfile({ provider, model, requestedModel: requested, family, override: env.AI_MODEL_PROFILE, maxOutputTokens: selected?.maxOutputTokens })
  const sdk = new OpenAI({
    apiKey,
    baseURL: provider === 'mia21' ? MIA21_BASE_URL : OPENAI_BASE_URL,
    timeout: 30_000, maxRetries: 0, logLevel: 'off',
    ...(provider === 'mia21' ? { organization: null, project: null } : {}),
    fetch: (url, init) => (options.fetch || globalThis.fetch)(url, { ...init, redirect: 'error' }),
  })
  return createChatCompletionsModel(sdk, model, profile, {
    name: provider, model, family, outputMode: profile.outputMode, profileSource: profile.source,
    discovery: catalog?.source || 'not-required',
    capabilities: selected?.capabilities || { tools: null, streaming: null, webSearch: null, vision: null, documents: null },
    memory: 'disabled', toolExecution: 'disabled', liveEvaluated: false,
  })
}
