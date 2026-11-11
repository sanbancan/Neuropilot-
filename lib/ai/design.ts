/** Backend orchestration. Provider selection precedes the existing retrieval/validation workflow. No tools, memory or authentication. */
import { getParadigmContext } from '@/lib/graph/queries'
import { resolveRequirements, resolveModality } from '@/lib/graph/requirements'
import { designResponseSchema, type DesignRequest, type DesignResponse, type DesignErrorResponse, type GenerationFailure } from '@/lib/schemas/design'
import { interpretObjective } from './interpret'
import { generatePlanWithLLM } from './neuroPilot'
import { buildFallbackPlan } from './fallback'
import { getConfiguredModel } from './providers'
import { ModelProviderError } from './providers/errors'
import { PROVIDER_ERROR_CODES } from '@/lib/schemas/provider'
import type { PlanModel } from './model'
import { validateScientificPlan } from './validate-plan'

export async function designObjective(request: DesignRequest, dependencies: {
  model?: PlanModel | null
  retrieve?: typeof getParadigmContext
} = {}): Promise<DesignResponse | DesignErrorResponse> {
  let model: PlanModel | null
  try { model = dependencies.model === undefined ? await getConfiguredModel() : dependencies.model } catch (error) {
    if (error instanceof ModelProviderError) return { error: { code: 'AI_PROVIDER_ERROR', message: error.message, providerCode: error.code } }
    return { error: { code: 'AI_PROVIDER_ERROR', message: 'AI provider setup failed. No automatic provider switch was made.' } }
  }
  const interpreted = await interpretObjective(request, model)
  if (interpreted.failure?.code === 'refused') return { error: { code: 'MODEL_REFUSED', message: interpreted.failure.message } }
  const resolved = resolveRequirements(request)
  const modality = resolveModality(request, interpreted.interpretation.modality)
  let context
  try {
    context = await (dependencies.retrieve || getParadigmContext)(interpreted.interpretation.paradigm, {
      modality: modality.modality,
      hardware: request.hardware, requirements: resolved.requirements, conflicts: [...resolved.conflicts, ...modality.conflicts], application: request.goal,
    })
  } catch {
    return { error: { code: 'GENERATION_FAILED', message: 'Knowledge retrieval failed. No design was generated.' } }
  }
  const params = { ...request, modality: modality.modality, context, interpretation: interpreted.interpretation }
  const gate = context.conflicts.length ? 'conflicting_requirements' : context.coverage.status === 'incompatible' ? 'incompatible_modality'
    : interpreted.interpretation.paradigm === 'unknown' ? 'unknown_objective'
    : context.coverage.status === 'missing' || !context.relationships.some(edge => edge.sourceIds?.some(id => context.sources.some(source => source.id === id))) ? 'missing_knowledge' : 'eligible'
  const canSynthesize = gate === 'eligible'
  // Infrastructure failures are not repaired by resending the same request or switching providers.
  const providerFailure = interpreted.failure && (PROVIDER_ERROR_CODES.some(code => code === interpreted.failure!.code) || ['timeout', 'api_error'].includes(interpreted.failure.code)) ? interpreted.failure : null
  const generated = canSynthesize && !providerFailure ? await generatePlanWithLLM(params, model) : null
  if (generated?.status === 'failed' && generated.failure.code === 'refused') return { error: { code: 'MODEL_REFUSED', message: generated.failure.message } }
  const success = generated?.status === 'success'
  const plan = success ? generated.plan : buildFallbackPlan(params)
  // Deterministic catalog results are held to the same structural and consistency contract.
  const catalogIssues = success ? [] : validateScientificPlan(plan, context)
  if (catalogIssues.length) return { error: { code: 'GENERATION_FAILED', message: 'Catalog context cannot produce a consistent response. No unsupported design was returned.' } }
  const fallbackReason: GenerationFailure | null = success ? null : providerFailure || (generated?.status === 'failed' ? generated.failure
    : { code: 'insufficient_knowledge', message: 'Plan synthesis was deferred because evidence or requirements are insufficient.' })
  return designResponseSchema.parse({
    plan,
    meta: {
      paradigmKey: context.paradigmKey, graphSource: context.source,
      generator: success ? 'llm' : 'fallback', model: success ? generated.model : null,
      generatedAt: new Date().toISOString(), attempts: generated?.attempts || 0, fallbackReason,
      interpretation: interpreted.interpretation, interpretationMethod: interpreted.method, interpretationFailure: interpreted.failure,
      interpretationAttempts: interpreted.attempts,
      diagnostics: { synthesis: success ? 'succeeded' : generated ? 'failed' : 'skipped', gate: providerFailure ? 'provider_unavailable' : gate, validationCategories: generated?.status === 'failed' ? generated.validationCategories || [] : [] },
      coverage: context.coverage, retrieval: context.retrieval, sources: context.sources,
      ...(model?.metadata ? { provider: model.metadata } : {}),
    },
  })
}
