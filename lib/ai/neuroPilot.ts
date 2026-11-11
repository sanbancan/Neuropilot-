/** Server-side, provider-neutral generation workflow with bounded repair. */
import {
  prototypePlanSchema, type PrototypePlan, type GenerationFailure,
  type GenerationFailureCode,
} from '@/lib/schemas/design'
import type { ParadigmContext } from '@/lib/graph/types'
import type { ObjectiveInterpretation } from '@/lib/schemas/knowledge'
import { NEUROPILOT_SYSTEM_PROMPT, buildUserPrompt } from './prompts'
import { ModelTimeoutError, type ModelMessage, type PlanModel } from './model'
import { getConfiguredModel } from './providers'
import { ModelProviderError } from './providers/errors'
import { planOutputSchema } from './output-schema'
import type { ProviderErrorCode } from '@/lib/schemas/provider'
import { validateScientificPlan } from './validate-plan'

export interface PlanInput {
  goal: string
  modality: string
  hardware?: string
  constraints?: string
  context: ParadigmContext
  interpretation?: ObjectiveInterpretation
}

export type GeneratePlanResult =
  | { status: 'success'; plan: PrototypePlan; model: string; attempts: number }
  | { status: 'failed'; failure: GenerationFailure; attempts: number; validationCategories?: ('schema' | 'provenance' | 'technical_consistency' | 'plan_state')[] }

const FAILURE_MESSAGES: Record<Exclude<GenerationFailureCode, ProviderErrorCode>, string> = {
  not_configured: 'AI generation is not configured.',
  api_error: 'The AI service request failed.',
  timeout: 'The AI service timed out.',
  refused: 'The AI service declined this request. No replacement plan was generated.',
  truncated: 'The AI response exceeded its output limit.',
  empty_response: 'The AI service returned no plan.',
  invalid_json: 'The AI response could not be parsed as JSON.',
  invalid_schema: 'The AI response did not match the plan contract.',
  unexpected_response: 'The AI service returned an incomplete or unsupported response.',
  scientific_validation: 'The AI plan failed scientific provenance or technical consistency checks.',
  insufficient_knowledge: 'Plan synthesis was deferred because evidence or requirements are insufficient.',
}

function failed(code: GenerationFailureCode, attempts: number): Extract<GeneratePlanResult, { status: 'failed' }> {
  return { status: 'failed', failure: { code, message: FAILURE_MESSAGES[code as keyof typeof FAILURE_MESSAGES] || new ModelProviderError(code as ProviderErrorCode).message }, attempts }
}

/** Accept a bare JSON document or a single whole-document Markdown JSON fence.
 * Never extract a plausible substring or fabricate missing/truncated fields.
 */
export function parsePlanJSON(content: string): unknown {
  const trimmed = content.replace(/^\uFEFF/, '').trim()
  const fence = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i)
  return JSON.parse(fence ? fence[1] : trimmed)
}

export async function generatePlanWithLLM(
  params: PlanInput,
  model?: PlanModel | null,
): Promise<GeneratePlanResult> {
  if (model === undefined) {
    try { model = await getConfiguredModel() } catch (error) {
      return error instanceof ModelProviderError ? { status: 'failed', failure: { code: error.code, message: error.message }, attempts: 0 } : failed('api_error', 0)
    }
  }
  if (!model) return failed('not_configured', 0)
  const messages: ModelMessage[] = [
    { role: 'system', content: NEUROPILOT_SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(params) },
  ]

  for (let attempt = 1; attempt <= 2; attempt++) {
    let reply
    try {
      reply = await model.complete(messages, { responseSchema: { name: 'prototype_plan', schema: planOutputSchema! } })
    } catch (error) {
      if (error instanceof ModelProviderError) return { status: 'failed', failure: { code: error.code, message: error.message }, attempts: attempt }
      return failed(error instanceof ModelTimeoutError ? 'timeout' : 'api_error', attempt)
    }
    // Refusal/content filtering is terminal; never bypass it through repair or fallback.
    if (reply.refusal || reply.finishReason === 'content_filter') return failed('refused', attempt)
    if (reply.finishReason === 'length') return failed('truncated', attempt)
    if (reply.finishReason !== 'stop') return failed('unexpected_response', attempt)

    let validationCategories: ('schema' | 'provenance' | 'technical_consistency' | 'plan_state')[] = []
    let code: GenerationFailureCode = 'invalid_json'
    let diagnostic = 'Return one complete JSON object, without commentary or Markdown.'
    const content = reply.content ?? ''
    if (!content.trim()) {
      code = 'empty_response'
      diagnostic = 'Your response was empty. Return a complete plan JSON object.'
    } else {
      let parsed: unknown
      let parsedJSON = false
      try {
        parsed = parsePlanJSON(content)
        parsedJSON = true
      } catch { /* A malformed document may receive one repair request. */ }
      if (parsedJSON) {
        const validation = prototypePlanSchema.safeParse(parsed)
        if (validation.success) {
          const issues = validateScientificPlan(validation.data, params.context)
          if (!issues.length) return { status: 'success', plan: validation.data, model: model.model, attempts: attempt }
          code = 'scientific_validation'
          validationCategories = [...new Set(issues.map(issue => /source|provenance|relationship|citation|Claim|retriev|Dataset/i.test(issue) ? 'provenance' as const : /state|Complete|Partial|clarification|coverage|Non-design|Missing paradigm/i.test(issue) ? 'plan_state' as const : 'technical_consistency' as const))]
          diagnostic = JSON.stringify(issues)
        } else {
          code = 'invalid_schema'
          validationCategories = ['schema']
          diagnostic = JSON.stringify(validation.error.issues.map(issue => ({
            path: issue.path, code: issue.code, message: issue.message,
          })))
        }
      }
    }
    if (attempt === 2) return { ...failed(code, attempt), validationCategories }
    messages.push(
      { role: 'assistant', content },
      { role: 'user', content: `The previous answer failed validation: ${diagnostic}\nCorrect it using the complete schema above. Do not invent evidence or experimental results.` },
    )
  }
  return failed('unexpected_response', 2)
}
