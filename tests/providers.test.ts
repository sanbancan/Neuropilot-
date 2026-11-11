import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getConfiguredModel, MIA21_BASE_URL, OPENAI_BASE_URL } from '@/lib/ai/providers'
import { createModelDiscovery, MIA21_MODELS_URL, parseModelCatalog, selectDiscoveredModel } from '@/lib/ai/providers/discovery'
import { resolveProfile } from '@/lib/ai/providers/profiles'
import { ModelProviderError } from '@/lib/ai/providers/errors'
import { normalizeCompletion } from '@/lib/ai/providers/chat-completions'
import { generatePlanWithLLM } from '@/lib/ai/neuroPilot'
import { designObjective } from '@/lib/ai/design'
import { input, context, validPlan, fixtureInterpretation } from './fixtures'
import { designRequestSchema } from '@/lib/schemas/design'

const catalog = { data: [
  { model: 'openai/gpt-4o-mini', provider: 'openai', capabilities: { tools: true, streaming: true, web_search: true, vision: true, documents: true } },
  { model: 'anthropic/claude-fixture', provider: 'anthropic', capabilities: { tools: true, streaming: true } },
  { model: 'gemini/gemini-fixture', provider: 'gemini', capabilities: { tools: false, streaming: true } },
  { model: 'openai/gpt-5-fixture', provider: 'openai', capabilities: { tools: false } },
] }
const discover = () => createModelDiscovery({ fetch: async url => { assert.equal(String(url), MIA21_MODELS_URL); return Response.json(catalog) } })
const envFor = (model: string) => ({ AI_PROVIDER: 'mia21', AI_MODEL: model, MIA21_API_KEY: 'mia-test-only', OPENAI_API_KEY: 'openai-must-not-be-used' })
const schema = { name: 'fixture_schema', schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false } }

for (const [id, family, content, finishReason] of [
  ['openai/gpt-4o-mini', 'gpt', JSON.stringify(validPlan()), 'stop'],
  ['anthropic/claude-fixture', 'claude', `\`\`\`json\n${JSON.stringify(validPlan())}\n\`\`\``, 'end_turn'],
  ['gemini/gemini-fixture', 'gemini', [{ type: 'text', text: JSON.stringify(validPlan()) }], 'STOP'],
] as const) {
  test(`${family} powers the same validated BCI workflow through Mia21`, async () => {
    const bodies: Record<string, unknown>[] = []
    const model = await getConfiguredModel({ env: envFor(id), discovery: discover(), fetch: async (url, init) => {
      assert.equal(String(url), `${MIA21_BASE_URL}/chat/completions`)
      const headers = new Headers(init?.headers)
      assert.equal(headers.get('authorization'), 'Bearer mia-test-only')
      assert.equal(headers.get('x-incognito'), 'true')
      for (const name of ['x-user-id', 'x-space-id', 'x-conversation-id']) assert.equal(headers.get(name), null)
      const body = JSON.parse(String(init?.body))
      bodies.push(body)
      assert.equal(body.model, id)
      assert.equal(body.max_tokens, 4096)
      assert.equal(body.stream, false)
      for (const name of ['user', 'tools', 'response_format', 'temperature', 'max_completion_tokens']) assert.equal(body[name], undefined)
      if (family === 'gemini') assert.equal(body.tool_choice, undefined)
      else assert.equal(body.tool_choice, 'none')
      return Response.json({ choices: [{ finish_reason: finishReason, message: { content } }] })
    } })
    assert.ok(model)
    assert.equal(model.metadata?.family, family)
    assert.equal(model.metadata?.outputMode, 'prompt')
    const generated = await generatePlanWithLLM(input, model)
    assert.equal(generated.status, 'success')
    if (generated.status === 'success') assert.deepEqual(generated.plan, validPlan())
    assert.equal(bodies.length, 1)
  })
}

for (const id of ['openai/gpt-4o-mini', 'anthropic/claude-fixture', 'gemini/gemini-fixture']) {
  test(`interpretation, retrieval, plan states and provenance are preserved for ${id}`, async () => {
    let requests = 0
    const model = await getConfiguredModel({ env: envFor(id), discovery: discover(), fetch: async (_url, init) => {
      requests++
      const body = JSON.parse(String(init?.body))
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(body.messages[0].content.includes('INTERPRET_OBJECTIVE') ? fixtureInterpretation : validPlan()) } }] })
    } })
    const response = await designObjective(designRequestSchema.parse({ goal: input.goal }), { model, retrieve: async () => context })
    assert.ok(!('error' in response))
    if ('error' in response) return
    assert.equal(response.plan.status, 'partial')
    assert.equal(response.meta.generator, 'llm')
    assert.equal(response.meta.provider?.model, id)
    assert.deepEqual(response.meta.sources, context.sources)
    assert.equal(requests, 2)
  })
}

test('Mia21 reasoning GPT profile omits temperature and selects completion-token parameter', async () => {
  const model = await getConfiguredModel({ env: envFor('openai/gpt-5-fixture'), discovery: discover(), fetch: async (_url, init) => {
    const body = JSON.parse(String(init?.body))
    assert.equal(body.max_completion_tokens, 4096)
    assert.equal(body.max_tokens, undefined)
    assert.equal(body.temperature, undefined)
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: '{}' } }] })
  } })
  await model!.complete([{ role: 'user', content: 'Return JSON.' }])
})

for (const outputMode of ['json_object', 'json_schema'] as const) {
  test(`operator-attested ${outputMode} uses the supplied schema contract without changing BCI logic`, async () => {
    const model = await getConfiguredModel({
      env: { ...envFor('gemini/gemini-fixture'), AI_MODEL_PROFILE: JSON.stringify({ model: 'gemini/gemini-fixture', outputMode, verifiedOutputModes: [outputMode], temperature: 0.2, maxOutputTokens: 2048 }) },
      discovery: discover(), fetch: async (_url, init) => {
        const body = JSON.parse(String(init?.body))
        assert.equal(body.response_format.type, outputMode)
        if (outputMode === 'json_schema') assert.deepEqual(body.response_format.json_schema, { name: schema.name, strict: true, schema: schema.schema })
        assert.equal(body.max_tokens, 2048)
        assert.equal(body.temperature, 0.2)
        return Response.json({ choices: [{ finish_reason: 'stop', message: { content: '{"ok":true}' } }] })
      },
    })
    assert.equal(model!.metadata?.profileSource, 'operator-configured')
    await model!.complete([{ role: 'user', content: 'Return JSON.' }], { responseSchema: schema })
  })
}

test('strict output receives distinct interpretation and plan schemas', async () => {
  const names: string[] = []
  const model = await getConfiguredModel({
    env: { ...envFor('anthropic/claude-fixture'), AI_MODEL_PROFILE: JSON.stringify({ model: 'anthropic/claude-fixture', outputMode: 'json_schema', verifiedOutputModes: ['json_schema'] }) }, discovery: discover(),
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body))
      names.push(body.response_format.json_schema.name)
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(names.length === 1 ? fixtureInterpretation : validPlan()) } }] })
    },
  })
  await designObjective(designRequestSchema.parse({ goal: input.goal }), { model, retrieve: async () => context })
  assert.deepEqual(names, ['objective_interpretation', 'prototype_plan'])
})

for (const override of [
  '{malformed', JSON.stringify({ model: 'another-model' }),
  JSON.stringify({ model: 'gemini/gemini-fixture', outputMode: 'json_schema' }),
  JSON.stringify({ model: 'gemini/gemini-fixture', temperature: 5 }),
  JSON.stringify({ model: 'gemini/gemini-fixture', tools: [{ name: 'unexpected' }] }),
]) {
  test(`invalid or unverified model profile fails before a paid request: ${override.slice(0, 45)}`, async () => {
    await assert.rejects(getConfiguredModel({ env: { ...envFor('gemini/gemini-fixture'), AI_MODEL_PROFILE: override }, discovery: discover(), fetch: async () => { assert.fail('Completion forbidden') } }), (error: unknown) => error instanceof ModelProviderError && error.code === 'provider_configuration')
  })
}

test('model switching invalidates an exact-model override', async () => {
  await assert.rejects(getConfiguredModel({ env: { ...envFor('gemini/gemini-fixture'), AI_MODEL_PROFILE: JSON.stringify({ model: 'anthropic/claude-fixture', outputMode: 'prompt' }) }, discovery: discover() }), ModelProviderError)
})

test('model selection accepts an unambiguous discovered alias but never chooses an alternative', async () => {
  const model = await getConfiguredModel({ env: envFor('claude-fixture'), discovery: discover() })
  assert.equal(model?.model, 'anthropic/claude-fixture')
  await assert.rejects(getConfiguredModel({ env: envFor('not-a-real-model'), discovery: discover(), fetch: async () => { assert.fail('No POST allowed') } }), (error: unknown) => error instanceof ModelProviderError && error.code === 'model_unavailable')
  const models = parseModelCatalog({ data: [{ model: 'openai/same', provider: 'openai' }, { model: 'anthropic/same', provider: 'anthropic' }] })
  assert.throws(() => selectDiscoveredModel(models, 'same'), ModelProviderError)
})

test('advertised tools/streaming do not establish JSON compatibility; absent flags remain unknown', () => {
  const models = parseModelCatalog({ data: [{ model: 'gemini/test', provider: 'google', capabilities: { tools: true, streaming: true, json_schema: true } }] })
  assert.equal(models[0].capabilities.vision, null)
  assert.equal(resolveProfile({ provider: 'mia21', model: models[0].id, requestedModel: models[0].id, family: models[0].family }).outputMode, 'prompt')
})

test('catalog cache has a TTL, coalesces concurrent requests, and sends no credentials', async () => {
  let now = 0, calls = 0
  const discovery = createModelDiscovery({ now: () => now, ttlMs: 1000, fetch: async (url, init) => {
    calls++
    assert.equal(String(url), MIA21_MODELS_URL)
    assert.equal(init?.method, 'GET')
    assert.equal(init?.headers, undefined)
    assert.equal(init?.credentials, 'omit')
    assert.equal(init?.redirect, 'error')
    return Response.json(catalog)
  } })
  await Promise.all([discovery.list(), discovery.list(), discovery.list()])
  assert.equal(calls, 1)
  assert.equal((await discovery.list()).source, 'cached')
  now = 1001
  assert.equal((await discovery.list()).source, 'live')
  assert.equal(calls, 2)
})

for (const payload of [{ error: 'private upstream message' }, { data: [{ model: 'no-provider' }] }, { data: [{ model: 'gemini/a', provider: 'gemini', capabilities: { tools: 'yes' } }] }]) {
  test('malformed discovery data fails closed without exposing upstream content', async () => {
    const discovery = createModelDiscovery({ fetch: async () => Response.json(payload) })
    await assert.rejects(discovery.list(), (error: unknown) => error instanceof ModelProviderError && error.code === 'discovery_failed' && !error.message.includes('private'))
  })
}

test('expired catalog is not reused after discovery failure', async () => {
  let now = 0, calls = 0
  const discovery = createModelDiscovery({ now: () => now, ttlMs: 100, fetch: async () => {
    calls++
    return calls === 1 ? Response.json(catalog) : new Response('private message', { status: 503 })
  } })
  await discovery.list()
  now = 101
  await assert.rejects(discovery.list(), ModelProviderError)
  await assert.rejects(discovery.list(), ModelProviderError)
  assert.equal(calls, 3)
})

for (const [status, code] of [[401, 'provider_authentication'], [403, 'provider_authentication'], [429, 'provider_rate_limit'], [404, 'model_unavailable'], [400, 'provider_bad_request'], [422, 'provider_bad_request'], [503, 'provider_unavailable']] as const) {
  test(`HTTP ${status} becomes ${code} without retries or rollback`, async () => {
    let calls = 0
    const model = await getConfiguredModel({ env: envFor('anthropic/claude-fixture'), discovery: discover(), fetch: async (url) => {
      calls++
      assert.equal(String(url), `${MIA21_BASE_URL}/chat/completions`)
      return Response.json({ error: { message: 'private upstream body and credentials' } }, { status })
    } })
    const result = await generatePlanWithLLM(input, model)
    assert.equal(result.status, 'failed')
    if (result.status === 'failed') assert.equal(result.failure.code, code)
    assert.equal(calls, 1)
    assert.doesNotMatch(JSON.stringify(result), /private|upstream body|mia-test-only|openai-must-not-be-used/)
  })
}

test('interpretation provider outage does not resend synthesis or hide the failure behind success', async () => {
  let calls = 0
  const model = await getConfiguredModel({ env: envFor('gemini/gemini-fixture'), discovery: discover(), fetch: async () => {
    calls++
    return new Response('', { status: 503 })
  } })
  const response = await designObjective(designRequestSchema.parse({ goal: input.goal }), { model, retrieve: async () => context })
  assert.ok(!('error' in response))
  if ('error' in response) return
  assert.equal(response.meta.generator, 'fallback')
  assert.equal(response.meta.attempts, 0)
  assert.equal(response.meta.interpretationAttempts, 1)
  assert.equal(response.meta.fallbackReason?.code, 'provider_unavailable')
  assert.equal(response.meta.provider?.name, 'mia21')
  assert.equal(calls, 1)
})

test('direct OpenAI rollback uses only OpenAI credentials and never discovers Mia21', async () => {
  let calls = 0
  const model = await getConfiguredModel({ env: { AI_PROVIDER: 'openai', OPENAI_API_KEY: 'openai-test', OPENAI_MODEL: 'gpt-4o-mini', MIA21_API_KEY: 'mia-must-not-leak' },
    discovery: { list: async () => { assert.fail('Discovery forbidden for rollback') } }, fetch: async (url, init) => {
      calls++
      assert.equal(String(url), `${OPENAI_BASE_URL}/chat/completions`)
      const headers = new Headers(init?.headers)
      assert.equal(headers.get('authorization'), 'Bearer openai-test')
      assert.equal(headers.get('x-incognito'), null)
      const body = JSON.parse(String(init?.body))
      assert.deepEqual(body.response_format, { type: 'json_object' })
      assert.equal(body.temperature, 0.3)
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(validPlan()) } }] })
    },
  })
  assert.equal((await generatePlanWithLLM(input, model)).status, 'success')
  assert.equal(model?.metadata?.name, 'openai')
  assert.equal(calls, 1)
})

test('missing Mia21 configuration never falls through to a configured OpenAI key', async () => {
  for (const env of [
    { AI_PROVIDER: 'mia21', OPENAI_API_KEY: 'must-not-use' },
    { AI_PROVIDER: 'mia21', MIA21_API_KEY: 'test', AI_MODEL: '' },
    { AI_PROVIDER: 'unknown-provider', OPENAI_API_KEY: 'must-not-use' },
  ]) await assert.rejects(getConfiguredModel({ env, fetch: async () => { assert.fail('Network forbidden') } }), ModelProviderError)
  assert.equal(await getConfiguredModel({ env: {} }), null)
})

test('unexpected tool requests cannot be disguised as successful JSON answers', async () => {
  assert.equal(normalizeCompletion({ choices: [{ finish_reason: 'stop', message: { content: '{}', tool_calls: [{ id: 'call_test', function: { name: 'write_to_db', arguments: '{}' } }] } }] }).finishReason, 'tool_calls')
  const model = await getConfiguredModel({ env: envFor('anthropic/claude-fixture'), discovery: discover(), fetch: async () => Response.json({ choices: [{ finish_reason: 'tool_calls', message: { content: '{}', tool_calls: [{ id: 'call_test' }] } }] }) })
  const result = await generatePlanWithLLM(input, model)
  assert.equal(result.status, 'failed')
  if (result.status === 'failed') assert.equal(result.failure.code, 'unexpected_response')
})

test('refusals, safety filtering and truncation normalize across gateway response variants', () => {
  assert.equal(normalizeCompletion({ choices: [{ finish_reason: 'MAX_TOKENS', message: { content: '{}' } }] }).finishReason, 'length')
  assert.equal(normalizeCompletion({ choices: [{ finish_reason: 'SAFETY', message: { content: null } }] }).finishReason, 'content_filter')
  assert.equal(normalizeCompletion({ choices: [{ finish_reason: 'stop', message: { content: [{ type: 'refusal', refusal: 'Declined' }] } }] }).refusal, 'Declined')
  assert.throws(() => normalizeCompletion({ choices: [{ finish_reason: 'stop', message: { content: [{ type: 'image', url: 'https://example.com' }] } }] }), ModelProviderError)
})

test('Mia21 never inherits direct OpenAI project or organization headers', async t => {
  const oldOrg = process.env.OPENAI_ORG_ID, oldProject = process.env.OPENAI_PROJECT_ID
  process.env.OPENAI_ORG_ID = 'private-openai-org'
  process.env.OPENAI_PROJECT_ID = 'private-openai-project'
  t.after(() => {
    if (oldOrg === undefined) delete process.env.OPENAI_ORG_ID; else process.env.OPENAI_ORG_ID = oldOrg
    if (oldProject === undefined) delete process.env.OPENAI_PROJECT_ID; else process.env.OPENAI_PROJECT_ID = oldProject
  })
  const model = await getConfiguredModel({ env: envFor('anthropic/claude-fixture'), discovery: discover(), fetch: async (_url, init) => {
    const headers = new Headers(init?.headers)
    assert.equal(headers.get('openai-organization'), null)
    assert.equal(headers.get('openai-project'), null)
    assert.equal(init?.redirect, 'error')
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: '{}' } }] })
  } })
  await model!.complete([{ role: 'user', content: 'JSON only.' }])
})

for (const name of ['AbortError', 'TypeError']) {
  test(`transport ${name} fails once with a sanitized timeout/unavailable result`, async () => {
    let calls = 0
    const model = await getConfiguredModel({ env: envFor('gemini/gemini-fixture'), discovery: discover(), fetch: async () => {
      calls++
      const error = new Error('private connection detail')
      error.name = name
      throw error
    } })
    const result = await generatePlanWithLLM(input, model)
    assert.equal(result.status, 'failed')
    if (result.status === 'failed') assert.equal(result.failure.code, name === 'AbortError' ? 'timeout' : 'provider_unavailable')
    assert.equal(calls, 1)
    assert.doesNotMatch(JSON.stringify(result), /private connection/)
  })
}

test('catalog-advertised output limit caps the configured token budget', async () => {
  const discovery = createModelDiscovery({ fetch: async () => Response.json({ data: [{ model: 'gemini/limited', provider: 'gemini', max_output_tokens: 1024 }] }) })
  const model = await getConfiguredModel({ env: envFor('gemini/limited'), discovery, fetch: async (_url, init) => {
    assert.equal(JSON.parse(String(init?.body)).max_tokens, 1024)
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: '{}' } }] })
  } })
  await model!.complete([{ role: 'user', content: 'Return JSON.' }])
})

test('strict schema without a schema fails locally, without making a request', async () => {
  const model = await getConfiguredModel({ env: { ...envFor('gemini/gemini-fixture'), AI_MODEL_PROFILE: JSON.stringify({ model: 'gemini/gemini-fixture', outputMode: 'json_schema', verifiedOutputModes: ['json_schema'] }) }, discovery: discover(), fetch: async () => assert.fail('No POST allowed') })
  await assert.rejects(model!.complete([{ role: 'user', content: 'Return JSON.' }]), ModelProviderError)
})

for (const code of ['content_policy_violation', 'safety_violation']) {
  test(`HTTP policy refusal ${code} cannot be bypassed through catalog fallback`, async () => {
    let calls = 0
    const model = await getConfiguredModel({ env: envFor('anthropic/claude-fixture'), discovery: discover(), fetch: async () => {
      calls++
      return Response.json({ error: { code, type: 'invalid_request_error', message: 'private policy detail' } }, { status: 400 })
    } })
    const response = await designObjective(designRequestSchema.parse({ goal: input.goal }), { model, retrieve: async () => { assert.fail('No retrieval after refusal') } })
    assert.ok('error' in response)
    if ('error' in response) assert.equal(response.error.code, 'MODEL_REFUSED')
    assert.equal(calls, 1)
    assert.doesNotMatch(JSON.stringify(response), /private policy/)
  })
}
