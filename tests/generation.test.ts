import assert from 'node:assert/strict'
import { test } from 'node:test'
import OpenAI from 'openai'
import { z } from 'zod'
import { generatePlanWithLLM, parsePlanJSON } from '@/lib/ai/neuroPilot'
import { createOpenAIModel } from '@/lib/ai/openai-model'
import { ModelTimeoutError, type ModelMessage, type ModelReply, type PlanModel } from '@/lib/ai/model'
import { prototypePlanSchema } from '@/lib/schemas/design'
import { planOutputSchema } from '@/lib/ai/output-schema'
import { input, validPlan } from './fixtures'

type Step = Partial<ModelReply> | Error
function mockModel(steps: Step[]) {
  const calls: ModelMessage[][] = []
  const model: PlanModel = {
    model: 'mock-model',
    async complete(messages) {
      calls.push(structuredClone(messages))
      const step = steps[calls.length - 1]
      assert.ok(step, 'Unexpected extra model call')
      if (step instanceof Error) throw step
      return { content: JSON.stringify(validPlan()), finishReason: 'stop', ...step }
    },
  }
  return { model, calls }
}

test('successful model plan is validated and receives complete generated output schema', async () => {
  const { model, calls } = mockModel([{}])
  const result = await generatePlanWithLLM(input, model)
  assert.equal(result.status, 'success')
  if (result.status !== 'success') return
  assert.deepEqual(result.plan, validPlan())
  assert.equal(result.attempts, 1)
  assert.equal(calls.length, 1)
  assert.ok(calls[0][1].content.includes(JSON.stringify(planOutputSchema, null, 2)))
  // All nested Zod field names occur in the generated schema, including optional fields.
  function checkFields(schema: z.ZodTypeAny) {
    if (schema instanceof z.ZodObject) {
      for (const [key, value] of Object.entries(schema.shape)) {
        assert.ok(JSON.stringify(planOutputSchema).includes(`"${key}"`), key)
        checkFields(value as z.ZodTypeAny)
      }
    } else if (schema instanceof z.ZodArray) checkFields(schema.element)
    else if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) checkFields(schema.unwrap())
  }
  checkFields(prototypePlanSchema)
})

for (const [label, content] of [
  ['malformed JSON', '{"title":'], ['schema failure', '{"title":"Missing fields"}'], ['empty response', ''],
] as const) {
  test(`${label} gets one repair containing the original answer and validation feedback`, async () => {
    const { model, calls } = mockModel([{ content }, {}])
    const result = await generatePlanWithLLM(input, model)
    assert.equal(result.status, 'success')
    assert.equal(result.attempts, 2)
    assert.equal(calls[1][2].role, 'assistant')
    assert.equal(calls[1][2].content, content)
    assert.match(calls[1][3].content, /failed validation/)
    if (label === 'schema failure') assert.match(calls[1][3].content, /summary/)
  })
}

for (const [label, steps, code, attempts] of [
  ['repeated invalid JSON', [{ content: 'bad' }, { content: 'bad again' }], 'invalid_json', 2],
  ['repeated invalid schema', [{ content: '{}' }, { content: '{}' }], 'invalid_schema', 2],
  ['repeated empty response', [{ content: null }, { content: '' }], 'empty_response', 2],
  ['refusal', [{ refusal: 'private provider text' }], 'refused', 1],
  ['content filtering', [{ finishReason: 'content_filter' }], 'refused', 1],
  ['truncation even with parseable content', [{ finishReason: 'length' }], 'truncated', 1],
  ['unexpected tool output', [{ finishReason: 'tool_calls' }], 'unexpected_response', 1],
  ['missing finish reason', [{ finishReason: null }], 'unexpected_response', 1],
  ['API failure', [new Error('secret provider credentials')], 'api_error', 1],
  ['timeout', [new ModelTimeoutError('private details')], 'timeout', 1],
  ['refusal during repair', [{ content: 'bad' }, { refusal: 'private provider text' }], 'refused', 2],
] as const) {
  test(`${label} returns a sanitized typed failure without extra retries`, async () => {
    const { model, calls } = mockModel([...steps])
    const result = await generatePlanWithLLM(input, model)
    assert.equal(result.status, 'failed')
    if (result.status !== 'failed') return
    assert.equal(result.failure.code, code)
    assert.equal(result.attempts, attempts)
    assert.equal(calls.length, attempts)
    assert.doesNotMatch(JSON.stringify(result), /secret|private/)
  })
}

test('missing provider remains an explicit offline outcome', async () => {
  const result = await generatePlanWithLLM(input, null)
  assert.equal(result.status, 'failed')
  if (result.status === 'failed') assert.equal(result.failure.code, 'not_configured')
  assert.equal(result.attempts, 0)
})

test('parser accepts a whole JSON fence but does not extract JSON from commentary', () => {
  assert.deepEqual(parsePlanJSON('\uFEFF ```json\n{"ok":true}\n``` '), { ok: true })
  assert.throws(() => parsePlanJSON('Commentary {"ok":true}'))
  assert.throws(() => parsePlanJSON('{"title":"unfinished'))
})

test('OpenAI transport keeps JSON mode and normalizes the SDK response using mocked fetch', async () => {
  let called = 0
  const sdk = new OpenAI({
    apiKey: 'test-only-placeholder', maxRetries: 0,
    fetch: async (_url, init) => {
      called++
      const body = JSON.parse(String(init?.body))
      assert.equal(body.model, 'mock-model')
      assert.deepEqual(body.response_format, { type: 'json_object' })
      assert.equal(body.max_tokens, 4096)
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(validPlan()) } }] })
    },
  })
  const result = await generatePlanWithLLM(input, createOpenAIModel(sdk, 'mock-model'))
  assert.equal(result.status, 'success')
  assert.equal(called, 1)
})

for (const [label, choices, code] of [
  ['missing choices', undefined, 'unexpected_response'],
  ['empty choices', [], 'unexpected_response'],
  ['non-text message', [{ finish_reason: 'stop', message: { content: { invalid: true } } }], 'empty_response'],
] as const) {
  test(`malformed SDK payload (${label}) never crashes the workflow`, async () => {
    const sdk = new OpenAI({
      apiKey: 'test-only-placeholder', maxRetries: 0,
      fetch: async () => Response.json({ choices }),
    })
    const result = await generatePlanWithLLM(input, createOpenAIModel(sdk, 'mock-model'))
    assert.equal(result.status, 'failed')
    if (result.status === 'failed') assert.equal(result.failure.code, code)
  })
}
