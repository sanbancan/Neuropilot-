/** Server-side OpenAI transport. No project or BCI-specific decisions here. */
import OpenAI from 'openai'
import type { PlanModel } from './model'
import { createChatCompletionsModel } from './providers/chat-completions'

let client: OpenAI | undefined
let clientKey: string | undefined

export function getOpenAIModel(): PlanModel | null {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  if (!client || clientKey !== apiKey) {
    client = new OpenAI({ apiKey, timeout: 30_000, maxRetries: 0 })
    clientKey = apiKey
  }
  return createOpenAIModel(client, process.env.OPENAI_MODEL || 'gpt-4o-mini')
}

/** Legacy constructor retained for existing direct-SDK consumers and regression tests. */
export function createOpenAIModel(sdk: OpenAI, model: string): PlanModel {
  return createChatCompletionsModel(sdk, model, {
    outputMode: 'json_object', tokenParameter: 'max_tokens', maxOutputTokens: 4096,
    temperature: 0.3, source: 'documented-direct',
  })
}
