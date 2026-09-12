/**
 * POST /api/design — NeuroPilot BCI Systems Architect endpoint.
 *
 * Accepts a `DesignRequest`, detects the paradigm, retrieves graph context,
 * runs the LLM agent (or falls back to the deterministic builder), and
 * returns a `DesignResponse` containing the plan and metadata.
 */

import { NextResponse } from 'next/server'
import {
  designRequestSchema,
  designResponseSchema,
  designErrorResponseSchema,
  type DesignResponse,
  type DesignErrorResponse,
} from '@/lib/schemas/design'
import { PARADIGM_INFO } from '@/lib/graph/types'
import { detectParadigm } from '@/lib/paradigm'
import { getParadigmContext } from '@/lib/graph/queries'
import { generatePlanWithLLM } from '@/lib/ai/neuroPilot'
import { buildFallbackPlan } from '@/lib/ai/fallback'

export async function POST(request: Request) {
  // ── 1. Parse and validate request ─────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(400, 'INVALID_INPUT', 'Invalid JSON body.')
  }

  const parseResult = designRequestSchema.safeParse(body)
  if (!parseResult.success) {
    return errorResponse(
      400,
      'INVALID_INPUT',
      parseResult.error.issues.map((i: { message: string }) => i.message).join('; '),
    )
  }

  const { goal, modality, hardware, constraints } = parseResult.data

  // ── 2. Detect paradigm ────────────────────────────────────────────────
  const detection = detectParadigm(goal)

  if (!detection.paradigm) {
    const supported = Object.values(PARADIGM_INFO).map(p => p.name)
    const resp: DesignErrorResponse = {
      error: {
        code: 'UNSUPPORTED_OBJECTIVE',
        message:
          'NeuroPilot currently has structured knowledge for the following BCI categories. ' +
          'Please rephrase your objective to fit one of them, or check back as we expand coverage.',
        details: supported,
      },
    }
    // Validate our own error shape
    designErrorResponseSchema.parse(resp)
    return NextResponse.json(resp, { status: 422 })
  }

  // ── 3. Retrieve graph context ─────────────────────────────────────────
  let context
  try {
    context = await getParadigmContext(detection.paradigm)
  } catch {
    return errorResponse(500, 'GENERATION_FAILED', 'Failed to retrieve graph context. Please try again.')
  }

  // ── 4. Generate plan (LLM → fallback) ────────────────────────────────
  const llmParams = { goal, modality, hardware, constraints, context }
  let plan = null
  let generator: 'llm' | 'fallback' = 'fallback'
  let model: string | null = null

  const llmResult = await generatePlanWithLLM(llmParams)
  if (llmResult) {
    plan = llmResult.plan
    generator = 'llm'
    model = llmResult.model
  } else {
    // Deterministic fallback
    plan = buildFallbackPlan(llmParams)
  }

  // ── 5. Build and validate response ────────────────────────────────────
  const response: DesignResponse = {
    plan,
    meta: {
      paradigmKey: detection.paradigm,
      graphSource: context.source,
      generator,
      model,
      generatedAt: new Date().toISOString(),
    },
  }

  // Validate our own output against the shared schema
  const validation = designResponseSchema.safeParse(response)
  if (!validation.success) {
    // This should never happen, but guard defensively
    return errorResponse(
      500,
      'GENERATION_FAILED',
      'Internal validation failed. Please try again.',
    )
  }

  return NextResponse.json(validation.data)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorResponse(
  status: number,
  code: DesignErrorResponse['error']['code'],
  message: string,
) {
  const body: DesignErrorResponse = {
    error: { code, message },
  }
  return NextResponse.json(body, { status })
}
