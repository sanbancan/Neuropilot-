/** Existing design endpoint; objective interpretation, coverage and validation run server-side. */
import { NextResponse } from 'next/server'
import { designRequestSchema } from '@/lib/schemas/design'
import { designObjective } from '@/lib/ai/design'

export async function POST(request: Request) {
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Invalid JSON body.' } }, { status: 400 })
  }
  const parsed = designRequestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: { code: 'INVALID_INPUT', message: parsed.error.issues.map(issue => issue.message).join('; ') } }, { status: 400 })
  const result = await designObjective(parsed.data)
  const status = 'error' in result ? result.error.code === 'MODEL_REFUSED' ? 422 : result.error.code === 'AI_PROVIDER_ERROR' ? 503 : 500 : 200
  return NextResponse.json(result, { status })
}
