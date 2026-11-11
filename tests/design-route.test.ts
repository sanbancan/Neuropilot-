import assert from 'node:assert/strict'
import { test } from 'node:test'
import { POST } from '@/app/api/design/route'
import { designResponseSchema } from '@/lib/schemas/design'
import { buildFallbackPlan } from '@/lib/ai/fallback'
import { input, fixtureInterpretation } from './fixtures'
import { retrieveContext } from '@/lib/graph/retrieve'
import { SEED_GRAPH } from '@/lib/graph/seed-data'

const routePlan = { ...buildFallbackPlan({ ...input, context: retrieveContext(SEED_GRAPH, { paradigm: 'motor-imagery', modality: 'EEG' }) }), title: 'Mocked model proposal' }

function request(body: unknown) {
  return new Request('http://localhost/api/design', { method: 'POST', body: JSON.stringify(body) })
}

// Node tests do not load .env files. Explicitly disable database connectivity as well.
for (const key of ['NEO4J_URI', 'NEO4J_USERNAME', 'NEO4J_PASSWORD', 'AI_PROVIDER', 'AI_MODEL', 'AI_MODEL_PROFILE', 'MIA21_API_KEY']) delete process.env[key]

test('offline route returns a validated, transparently labeled catalog result', async t => {
  const key = process.env.OPENAI_API_KEY
  delete process.env.OPENAI_API_KEY
  t.after(() => { if (key !== undefined) process.env.OPENAI_API_KEY = key })
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Network forbidden in tests') })
  const response = await POST(request({ goal: input.goal, modality: 'EEG' }))
  assert.equal(response.status, 200)
  const result = designResponseSchema.parse(await response.json())
  assert.equal(result.meta.generator, 'fallback')
  assert.equal(result.meta.model, null)
  assert.equal(result.meta.attempts, 0)
  assert.equal(result.meta.fallbackReason?.code, 'not_configured')
  assert.match(result.plan.title, /Catalog Starting Point/)
  assert.ok(result.plan.limitations.some(text => text.includes('not been fully evaluated')))
})

for (const mode of ['success', 'refusal', 'truncated', 'api_error', 'invalid_json', 'invalid_schema'] as const) {
  test(`route handles mocked model ${mode} without a real API call`, async t => {
    const previousKey = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = `test-placeholder-${mode}`
    t.after(() => {
      if (previousKey === undefined) delete process.env.OPENAI_API_KEY
      else process.env.OPENAI_API_KEY = previousKey
    })
    let calls = 0
    t.mock.method(globalThis, 'fetch', async (url: string | URL | Request, init?: RequestInit) => {
      assert.match(String(url), /^https:\/\/api\.openai\.com\/v1\/chat\/completions$/)
      calls++
      const payload = JSON.parse(String(init?.body))
      if (payload.messages[0].content.includes('TASK: INTERPRET_OBJECTIVE')) return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(fixtureInterpretation) } }] })
      if (mode === 'api_error') return Response.json({ error: { message: 'sensitive upstream error' } }, { status: 503 })
      return Response.json({ choices: [{
        finish_reason: mode === 'truncated' ? 'length' : 'stop',
        message: {
          content: mode === 'invalid_json' ? 'broken' : mode === 'invalid_schema' ? '{}' : JSON.stringify(routePlan),
          refusal: mode === 'refusal' ? 'sensitive refusal details' : null,
        },
      }] })
    })
    const response = await POST(request({ goal: input.goal, modality: 'EEG' }))
    const body = await response.json()
    if (mode === 'refusal') {
      assert.equal(response.status, 422)
      assert.equal(body.error.code, 'MODEL_REFUSED')
      assert.equal(body.plan, undefined)
    } else {
      assert.equal(response.status, 200)
      const result = designResponseSchema.parse(body)
      assert.equal(result.meta.generator, mode === 'success' ? 'llm' : 'fallback')
      if (mode === 'success') assert.deepEqual(result.plan, JSON.parse(JSON.stringify(routePlan)))
      else assert.equal(result.meta.fallbackReason?.code, mode === 'api_error' ? 'provider_unavailable' : mode)
    }
    assert.doesNotMatch(JSON.stringify(body), /sensitive/)
    assert.equal(calls, ['invalid_json', 'invalid_schema'].includes(mode) ? 3 : 2)
  })
}

test('invalid inputs reject early; unknown offline objectives return clarification', async t => {
  const key = process.env.OPENAI_API_KEY
  delete process.env.OPENAI_API_KEY
  t.after(() => { if (key !== undefined) process.env.OPENAI_API_KEY = key })
  t.mock.method(globalThis, 'fetch', async () => { assert.fail('Network forbidden') })
  assert.equal((await POST(request({ goal: 'short' }))).status, 400)
  const unknown = await POST(request({ goal: 'A completely unrelated objective without catalog coverage.' }))
  assert.equal(unknown.status, 200)
  assert.equal((await unknown.json()).plan.status, 'clarification_required')
  assert.equal((await POST(new Request('http://localhost/api/design', { method: 'POST', body: '{' }))).status, 400)
})

test('catalog fallback does not turn fNIRS input into an EEG plan labeled fNIRS', () => {
  const plan = buildFallbackPlan({ ...input, modality: 'fNIRS', hardware: 'Unknown hardware', constraints: 'Unknown constraints' })
  assert.equal(plan.modality, 'fNIRS')
  assert.equal(plan.status, 'unsupported')
  assert.deepEqual(plan.electrodes.recommended, [])
  assert.ok(plan.limitations.some(text => text.includes('Requested modality fNIRS')))
  assert.ok(plan.limitations.some(text => text.includes('Unknown hardware')))
})
