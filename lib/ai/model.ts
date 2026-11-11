import type { ProviderMetadata } from '@/lib/schemas/provider'

/** Server-side transport seam. BCI prompting/validation stays outside providers. */
export interface ModelMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ModelReply {
  content: string | null
  refusal?: string | null
  finishReason: string | null
}

export interface ModelRequestOptions {
  responseSchema?: { name: string; schema: Record<string, unknown> }
}

export interface PlanModel {
  metadata?: ProviderMetadata
  model: string
  complete(messages: ModelMessage[], options?: ModelRequestOptions): Promise<ModelReply>
}

export class ModelTimeoutError extends Error {}
