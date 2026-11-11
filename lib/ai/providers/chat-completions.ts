/** Shared OpenAI-compatible wire adapter; never executes tools or changes providers. */
import OpenAI from 'openai'
import { ModelTimeoutError, type ModelMessage, type ModelReply, type PlanModel, type ModelRequestOptions } from '../model'
import type { ProviderMetadata } from '@/lib/schemas/provider'
import type { ModelProfile } from './profiles'
import { ModelProviderError } from './errors'

type ObjectValue = Record<string, unknown>
const object = (value: unknown): ObjectValue => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as ObjectValue : {}

export function normalizeCompletion(response: unknown): ModelReply {
  const choices = object(response).choices
  const choice = object(Array.isArray(choices) ? choices[0] : undefined)
  const message = object(choice.message)
  let content = typeof message.content === 'string' ? message.content : null
  let refusal = typeof message.refusal === 'string' ? message.refusal : null
  if (Array.isArray(message.content)) {
    const text: string[] = []
    for (const value of message.content) {
      const part = object(value)
      if (part.type === 'text' && typeof part.text === 'string') text.push(part.text)
      else if (part.type === 'refusal' && typeof part.refusal === 'string') refusal = part.refusal
      else throw new ModelProviderError('provider_response')
    }
    content = text.join('') || null
  }
  const rawReason = typeof choice.finish_reason === 'string' ? choice.finish_reason : null
  let finishReason = rawReason
  if (['stop', 'STOP', 'end_turn'].includes(rawReason || '')) finishReason = 'stop'
  else if (['length', 'MAX_TOKENS', 'max_tokens'].includes(rawReason || '')) finishReason = 'length'
  else if (['content_filter', 'SAFETY', 'safety', 'RECITATION'].includes(rawReason || '')) finishReason = 'content_filter'
  else if (['tool_calls', 'tool_use', 'function_call'].includes(rawReason || '')) finishReason = 'tool_calls'
  // Never accept a JSON answer while silently overlooking a tool request.
  if (Array.isArray(message.tool_calls) && message.tool_calls.length || message.function_call) finishReason = 'tool_calls'
  return { content, refusal, finishReason }
}

function classifyError(error: unknown): never {
  if (error instanceof ModelProviderError) throw error
  if (error instanceof OpenAI.APIConnectionTimeoutError) throw new ModelTimeoutError('AI request timed out')
  if (error instanceof OpenAI.APIError) {
    if ([401, 403].includes(error.status || 0)) throw new ModelProviderError('provider_authentication')
    if (error.status === 429) throw new ModelProviderError('provider_rate_limit')
    if (error.status === 404) throw new ModelProviderError('model_unavailable')
    if ([400, 422].includes(error.status || 0)) throw new ModelProviderError('provider_bad_request')
  }
  throw new ModelProviderError('provider_unavailable')
}

export function createChatCompletionsModel(sdk: OpenAI, model: string, profile: ModelProfile, metadata?: ProviderMetadata): PlanModel {
  return {
    model, metadata,
    async complete(messages: ModelMessage[], options?: ModelRequestOptions) {
      if (profile.outputMode === 'json_schema' && !options?.responseSchema) throw new ModelProviderError('provider_configuration')
      const responseFormat = profile.outputMode === 'json_object' ? { type: 'json_object' as const }
        : profile.outputMode === 'json_schema' ? {
          type: 'json_schema' as const,
          json_schema: { name: options!.responseSchema!.name, strict: true, schema: options!.responseSchema!.schema },
        } : undefined
      try {
        const response = await sdk.chat.completions.create({
          model, messages, stream: false,
          [profile.tokenParameter]: profile.maxOutputTokens,
          ...(profile.temperature !== null ? { temperature: profile.temperature } : {}),
          ...(responseFormat ? { response_format: responseFormat } : {}),
          ...(metadata?.capabilities.tools === true ? { tool_choice: 'none' as const } : {}),
        }, {
          // No user, space or conversation identity is configured. No initialization API is called.
          ...(metadata?.name === 'mia21' ? { headers: { 'X-Incognito': 'true' } } : {}),
        })
        return normalizeCompletion(response)
      } catch (error) {
        // Gateways can express policy refusal as an HTTP error instead of a message refusal.
        if (error instanceof OpenAI.APIError && [error.code, error.type].some(code => typeof code === 'string' && ['content_filter', 'content_policy_violation', 'safety', 'safety_violation', 'prohibited_content'].includes(code.toLowerCase()))) {
          return { content: null, refusal: 'The AI provider declined this request.', finishReason: 'content_filter' }
        }
        return classifyError(error)
      }
    },
  }
}
