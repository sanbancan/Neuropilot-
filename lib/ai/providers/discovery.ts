/** Public, credential-free discovery only. No completion or initialization calls. */
import { z } from 'zod'
import type { ModelCapabilities } from '@/lib/schemas/provider'
import { ModelProviderError } from './errors'

export const MIA21_MODELS_URL = 'https://api.mia21.com/api/v1/models'
export type ModelFamily = 'gpt' | 'claude' | 'gemini'
export interface DiscoveredModel {
  id: string
  family: ModelFamily
  capabilities: ModelCapabilities
  maxOutputTokens: number | null
}
const entrySchema = z.object({
  model: z.string().min(1).optional(), id: z.string().min(1).optional(), provider: z.string().optional(),
  capabilities: z.object({ tools: z.boolean().optional(), streaming: z.boolean().optional(), web_search: z.boolean().optional(), vision: z.boolean().optional(), documents: z.boolean().optional() }).optional(),
  max_output_tokens: z.number().int().positive().optional(),
})
const catalogSchema = z.object({ data: z.array(entrySchema).max(2000) })

export function parseModelCatalog(input: unknown): DiscoveredModel[] {
  const parsed = catalogSchema.safeParse(input)
  if (!parsed.success) throw new ModelProviderError('discovery_failed')
  const models: DiscoveredModel[] = []
  for (const entry of parsed.data.data) {
    const id = entry.model || entry.id
    if (!id || !/^[a-zA-Z0-9][a-zA-Z0-9._:/+-]{0,199}$/.test(id)) throw new ModelProviderError('discovery_failed')
    const provider = (entry.provider || id.split('/')[0]).toLowerCase()
    const family = provider === 'openai' ? 'gpt' : provider === 'anthropic' ? 'claude' : ['gemini', 'google'].includes(provider) ? 'gemini' : null
    if (!family) continue
    if (models.some(model => model.id === id)) throw new ModelProviderError('discovery_failed')
    models.push({ id, family, maxOutputTokens: entry.max_output_tokens || null, capabilities: {
      tools: entry.capabilities?.tools ?? null, streaming: entry.capabilities?.streaming ?? null,
      webSearch: entry.capabilities?.web_search ?? null, vision: entry.capabilities?.vision ?? null, documents: entry.capabilities?.documents ?? null,
    } })
  }
  if (!models.length) throw new ModelProviderError('discovery_failed')
  return models
}

export function createModelDiscovery(options: { fetch?: typeof fetch; now?: () => number; ttlMs?: number } = {}) {
  let cached: { models: DiscoveredModel[]; expiresAt: number } | null = null
  let pending: Promise<DiscoveredModel[]> | null = null
  const now = options.now || Date.now
  return {
    async list(): Promise<{ models: DiscoveredModel[]; source: 'live' | 'cached' }> {
      if (cached && cached.expiresAt > now()) return { models: structuredClone(cached.models), source: 'cached' }
      if (!pending) pending = (async () => {
        try {
          const response = await (options.fetch || globalThis.fetch)(MIA21_MODELS_URL, {
            method: 'GET', credentials: 'omit', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000),
          })
          if (!response.ok) throw new ModelProviderError('discovery_failed')
          const body = await response.text()
          if (body.length > 1_000_000) throw new ModelProviderError('discovery_failed')
          const models = parseModelCatalog(JSON.parse(body))
          cached = { models, expiresAt: now() + (options.ttlMs ?? 300_000) }
          return models
        } catch { throw new ModelProviderError('discovery_failed') }
      })()
      const request = pending
      try { return { models: structuredClone(await request), source: 'live' } }
      finally { if (pending === request) pending = null }
    },
  }
}
export type ModelDiscovery = ReturnType<typeof createModelDiscovery>
export const mia21Discovery = createModelDiscovery()

export function selectDiscoveredModel(models: DiscoveredModel[], requested: string): DiscoveredModel {
  const exact = models.find(model => model.id === requested)
  if (exact) return exact
  const aliases = models.filter(model => model.id.split('/').pop() === requested)
  if (aliases.length !== 1) throw new ModelProviderError('model_unavailable')
  return aliases[0]
}
