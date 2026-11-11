import assert from 'node:assert/strict'
import { test } from 'node:test'
import { interpretObjective } from '@/lib/ai/interpret'
import { objectiveHints } from '@/lib/paradigm'
import { designRequestSchema } from '@/lib/schemas/design'
import type { PlanModel } from '@/lib/ai/model'

function modelFor(content: unknown): PlanModel {
  return { model: 'mock-interpretation', complete: async messages => {
    assert.match(messages[0].content, /INTERPRET_OBJECTIVE/)
    return { finishReason: 'stop', content: JSON.stringify(content) }
  } }
}
for (const [goal, paradigm] of [
  ['Turn a mental rehearsal of squeezing my fists into a cursor command.', 'motor-imagery'],
  ['Pick a screen item by attending to its frequency-tagged stimulus.', 'ssvep'],
  ['Explore posterior rhythms while practicing mindfulness.', 'meditation-alpha'],
  ['Recognize the ERP when a rare target letter appears in a speller.', 'p300'],
] as const) {
  test(`provider-neutral interpretation handles paraphrase: ${paradigm}`, async () => {
    const request = designRequestSchema.parse({ goal })
    const result = await interpretObjective(request, modelFor({ summary: goal, paradigm, candidates: [paradigm], modality: 'EEG', questions: [] }))
    assert.equal(result.interpretation.paradigm, paradigm)
    assert.equal(result.method, 'model')
  })
}

test('natural language outside offline dictionaries still reaches the model', async () => {
  const request = designRequestSchema.parse({ goal: 'Let my unspoken movement rehearsal steer a cursor.' })
  assert.equal(objectiveHints(request.goal).paradigm, 'unknown')
  const result = await interpretObjective(request, modelFor({ summary: 'Movement rehearsal', paradigm: 'motor-imagery', candidates: ['motor-imagery'], modality: 'EEG', questions: [] }))
  assert.equal(result.interpretation.paradigm, 'motor-imagery')
})

test('P300 is recognized offline and cannot be remapped to SSVEP by a model', async () => {
  const request = designRequestSchema.parse({ goal: 'Build a P300 visual speller for letter selection.' })
  assert.equal(objectiveHints(request.goal).paradigm, 'p300')
  const result = await interpretObjective(request, modelFor({ summary: 'Visual spelling', paradigm: 'ssvep', candidates: ['ssvep'], modality: 'EEG', questions: [] }))
  assert.equal(result.interpretation.paradigm, 'p300')
})

test('visual spelling alone is ambiguous; offline mode asks rather than assumes', async () => {
  const result = await interpretObjective(designRequestSchema.parse({ goal: 'Build a visual speller to type letters on a screen.' }), null)
  assert.equal(result.interpretation.paradigm, 'unknown')
  assert.ok(result.interpretation.questions.length)
  assert.equal(result.failure?.code, 'not_configured')
})

test('explicitly ambiguous P300 and SSVEP objective requires clarification', async () => {
  const result = await interpretObjective(designRequestSchema.parse({ goal: 'Use either P300 or SSVEP to build a visual selection BCI.' }), modelFor({ summary: 'Selection BCI', paradigm: 'ssvep', candidates: ['ssvep'], modality: 'EEG', questions: [] }))
  assert.equal(result.interpretation.paradigm, 'unknown')
  assert.deepEqual(result.interpretation.candidates, ['p300', 'ssvep'])
  assert.ok(result.interpretation.questions.length)
})

test('malformed interpretation and API failure fall back transparently', async () => {
  const request = designRequestSchema.parse({ goal: 'Explore motor imagery using EEG signals.' })
  const malformed = await interpretObjective(request, { model: 'mock', complete: async () => ({ finishReason: 'stop', content: 'bad json' }) })
  assert.equal(malformed.failure?.code, 'invalid_json')
  assert.equal(malformed.method, 'offline-hints')
  const error = await interpretObjective(request, { model: 'mock', complete: async () => { throw new Error('private upstream detail') } })
  assert.equal(error.failure?.code, 'api_error')
  assert.doesNotMatch(JSON.stringify(error), /private/)
})

test('explicit preference for P300 rather than SSVEP is not treated as ambiguity', async () => {
  const request = designRequestSchema.parse({ goal: 'Build a P300 speller rather than SSVEP.' })
  assert.equal(objectiveHints(request.goal).paradigm, 'p300')
  const result = await interpretObjective(request, modelFor({ summary: 'ERP spelling', paradigm: 'p300', candidates: ['p300'], modality: 'EEG', questions: [] }))
  assert.equal(result.interpretation.paradigm, 'p300')
  assert.deepEqual(result.interpretation.questions, [])
})
