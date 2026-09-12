/**
 * NeuroPilot BCI Systems Architect — OpenAI integration.
 *
 * Calls the configured OpenAI chat-completions model with structured JSON
 * output, validates the response against the shared Zod schema, and allows
 * one repair retry when validation fails.
 *
 * All OpenAI calls are server-side only — this module must never be
 * imported from client components.
 */

import OpenAI from 'openai'
import { prototypePlanSchema, type PrototypePlan } from '@/lib/schemas/design'
import type { ParadigmContext } from '@/lib/graph/types'
import { NEUROPILOT_SYSTEM_PROMPT, buildUserPrompt } from './prompts'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function getModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-4o-mini'
}

function getApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY
}

// ---------------------------------------------------------------------------
// Client (lazy singleton)
// ---------------------------------------------------------------------------

let _client: OpenAI | null | undefined = undefined

function getClient(): OpenAI | null {
  if (_client !== undefined) return _client

  const key = getApiKey()
  if (!key) {
    _client = null
    return null
  }

  _client = new OpenAI({ apiKey: key })
  return _client
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface GeneratePlanResult {
  plan: PrototypePlan
  model: string
}

/**
 * Generate a `PrototypePlan` using the OpenAI chat model.
 *
 * Returns `null` when:
 * - `OPENAI_API_KEY` is not set
 * - The model call fails
 * - Output fails Zod validation after one repair retry
 *
 * The caller should fall back to the deterministic builder in those cases.
 */
export async function generatePlanWithLLM(params: {
  goal: string
  modality: string
  hardware?: string
  constraints?: string
  context: ParadigmContext
}): Promise<GeneratePlanResult | null> {
  const client = getClient()
  if (!client) return null

  const model = getModel()
  const userPrompt = buildUserPrompt(params)

  // First attempt
  const firstAttempt = await callModel(client, model, userPrompt)
  if (!firstAttempt) return null

  const firstValidation = prototypePlanSchema.safeParse(firstAttempt)
  if (firstValidation.success) {
    return { plan: firstValidation.data, model }
  }

  // Repair retry — include the validation errors so the model can fix them
  const repairPrompt = `${userPrompt}\n\n---\n\nYour previous response failed validation:\n${JSON.stringify(firstValidation.error.issues, null, 2)}\n\nPlease return a corrected JSON object that passes all validation rules.`

  const retryAttempt = await callModel(client, model, repairPrompt)
  if (!retryAttempt) return null

  const retryValidation = prototypePlanSchema.safeParse(retryAttempt)
  if (retryValidation.success) {
    return { plan: retryValidation.data, model }
  }

  // Both attempts failed — caller will use deterministic fallback
  return null
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Call the OpenAI chat model and parse the JSON response.
 * Returns `null` on any error.
 */
async function callModel(
  client: OpenAI,
  model: string,
  userPrompt: string,
): Promise<unknown | null> {
  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: NEUROPILOT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 4096,
    })

    const content = response.choices[0]?.message?.content
    if (!content) return null

    return JSON.parse(content)
  } catch {
    return null
  }
}
