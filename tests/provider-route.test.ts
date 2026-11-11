import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { POST } from '@/app/api/design/route'
import { buildFallbackPlan } from '@/lib/ai/fallback'
import { retrieveContext } from '@/lib/graph/retrieve'
import { SEED_GRAPH } from '@/lib/graph/seed-data'
import { designResponseSchema } from '@/lib/schemas/design'
import { input, fixtureInterpretation } from './fixtures'
import { MIA21_BASE_URL } from '@/lib/ai/providers'
import { MIA21_MODELS_URL } from '@/lib/ai/providers/discovery'

for (const key of ['NEO4J_URI', 'NEO4J_USERNAME', 'NEO4J_PASSWORD', 'AI_PROVIDER', 'AI_MODEL', 'AI_MODEL_PROFILE', 'MIA21_API_KEY', 'OPENAI_API_KEY', 'OPENAI_MODEL']) delete process.env[key]
const catalog = { data: [{ model: 'anthropic/claude-fixture', provider: 'anthropic', capabilities: { tools: true, streaming: true } }] }
const request = () => new Request('http://localhost/api/design', { method: 'POST', body: JSON.stringify({ goal: input.goal, modality: 'EEG' }) })
function configure(t: TestContext, extra: Record<string, string | undefined> = {}) {
  const vars = { AI_PROVIDER: 'mia21', AI_MODEL: 'anthropic/claude-fixture', MIA21_API_KEY: 'mia-route-test', OPENAI_API_KEY: 'must-not-be-used', AI_MODEL_PROFILE: '', ...extra }
  for (const [key, value] of Object.entries(vars)) {
    const previous = process.env[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous })
  }
}

test('missing Mia21 credentials produce HTTP 503 rather than silently using OpenAI or demo mode', async t => {
  configure(t, { MIA21_API_KEY: undefined })
  t.mock.method(globalThis, 'fetch', async () => assert.fail('No network request expected'))
  const response = await POST(request())
  assert.equal(response.status, 503)
  const body = await response.json()
  assert.equal(body.error.code, 'AI_PROVIDER_ERROR')
  assert.equal(body.error.providerCode, 'provider_configuration')
  assert.equal(body.plan, undefined)
})

test('catalog discovery failure is an explicit sanitized HTTP 503', async t => {
  configure(t)
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request) => {
    calls++
    assert.equal(String(url), MIA21_MODELS_URL)
    return Response.json({ error: 'private upstream discovery body' }, { status: 503 })
  })
  const response = await POST(request())
  assert.equal(response.status, 503)
  const body = await response.json()
  assert.equal(body.error.providerCode, 'discovery_failed')
  assert.doesNotMatch(JSON.stringify(body), /private|must-not-be-used/)
  assert.equal(calls, 1)
})

test('unavailable model returns HTTP 503 without any completion request', async t => {
  configure(t, { AI_MODEL: 'not-offered' })
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request) => {
    assert.equal(String(url), MIA21_MODELS_URL)
    return Response.json(catalog)
  })
  const response = await POST(request())
  assert.equal(response.status, 503)
  assert.equal((await response.json()).error.providerCode, 'model_unavailable')
})

test('Mia21 model selection reaches the existing endpoint with preserved scientific output', async t => {
  configure(t)
  let completions = 0
  const plan = { ...buildFallbackPlan({ ...input, context: retrieveContext(SEED_GRAPH, { paradigm: 'motor-imagery', modality: 'EEG' }) }), title: 'Mia21 model-generated proposal' }
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url) === MIA21_MODELS_URL) return Response.json(catalog)
    assert.equal(String(url), `${MIA21_BASE_URL}/chat/completions`)
    assert.equal(new Headers(init?.headers).get('x-incognito'), 'true')
    completions++
    const body = JSON.parse(String(init?.body))
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(body.messages[0].content.includes('INTERPRET_OBJECTIVE') ? fixtureInterpretation : plan) } }] })
  })
  const response = await POST(request())
  assert.equal(response.status, 200)
  const body = designResponseSchema.parse(await response.json())
  assert.equal(body.meta.generator, 'llm')
  assert.equal(body.meta.provider?.name, 'mia21')
  assert.equal(body.meta.provider?.family, 'claude')
  assert.equal(body.meta.provider?.outputMode, 'prompt')
  assert.deepEqual(body.plan, JSON.parse(JSON.stringify(plan)))
  assert.equal(completions, 2)
})

test('provider outage is labeled in catalog output and is never retried via direct OpenAI', async t => {
  configure(t)
  let completions = 0
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request) => {
    if (String(url) === MIA21_MODELS_URL) return Response.json(catalog)
    assert.equal(String(url), `${MIA21_BASE_URL}/chat/completions`)
    completions++
    return Response.json({ error: { message: 'private upstream information' } }, { status: 503 })
  })
  const response = await POST(request())
  assert.equal(response.status, 200)
  const body = designResponseSchema.parse(await response.json())
  assert.equal(body.meta.generator, 'fallback')
  assert.equal(body.meta.fallbackReason?.code, 'provider_unavailable')
  assert.equal(body.meta.interpretationFailure?.code, 'provider_unavailable')
  assert.equal(body.meta.provider?.name, 'mia21')
  assert.equal(body.meta.attempts, 0)
  assert.equal(completions, 1)
  assert.doesNotMatch(JSON.stringify(body), /private upstream|mia-route-test|must-not-be-used/)
})

test('Mia21 refusal remains HTTP 422 with no substitute plan', async t => {
  configure(t)
  let completions = 0
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request) => {
    if (String(url) === MIA21_MODELS_URL) return Response.json(catalog)
    assert.equal(String(url), `${MIA21_BASE_URL}/chat/completions`)
    completions++
    return Response.json({ choices: [{ finish_reason: 'content_filter', message: { content: null } }] })
  })
  const response = await POST(request())
  const body = await response.json()
  assert.equal(response.status, 422)
  assert.equal(body.error.code, 'MODEL_REFUSED')
  assert.equal(body.plan, undefined)
  assert.equal(completions, 1)
})
