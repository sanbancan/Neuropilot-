import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateScientificPlan } from '@/lib/ai/validate-plan'
import { generatePlanWithLLM } from '@/lib/ai/neuroPilot'
import { designObjective } from '@/lib/ai/design'
import { buildFallbackPlan } from '@/lib/ai/fallback'
import { retrieveContext } from '@/lib/graph/retrieve'
import { SEED_GRAPH } from '@/lib/graph/seed-data'
import type { getParadigmContext } from '@/lib/graph/queries'
const offlineRetrieve: typeof getParadigmContext = async (paradigm, options = {}) => retrieveContext(SEED_GRAPH, { ...options, paradigm }, 'in-memory', { status: 'fallback', reason: 'not_configured' })
import { prototypePlanSchema, designRequestSchema } from '@/lib/schemas/design'
import { context, validPlan, input, fixtureInterpretation } from './fixtures'

function completePlan() {
  const plan = validPlan()
  plan.status = 'complete'
  plan.gaps = []
  plan.deployment = { target: 'desktop', recommendations: ['Fixture deployment'], tradeoffs: ['Device-specific latency remains to be measured.'] }
  plan.claims.push({ section: 'deployment', kind: 'engineering_recommendation', statement: 'Fixture deployment proposal.', sourceIds: ['fixture:reviewed'], relationshipIds: ['fixture:deployment'] })
  return plan
}

test('complete plans pass only with sufficient reviewed coverage and all required sections', () => {
  assert.equal(context.coverage.status, 'sufficient')
  const plan = completePlan()
  assert.deepEqual(validateScientificPlan(plan, context), [])
  plan.classifier = null
  assert.ok(validateScientificPlan(plan, context).some(issue => issue.includes('missing essential')))
})

test('partial designs can omit classifier, montage, hardware, sampling and protocols', () => {
  const plan = validPlan()
  plan.classifier = null
  plan.electrodes.recommended = []
  plan.hardware = { deviceKey: null, requirements: [], reason: 'No supported device selection.' }
  plan.sampling = { rateHz: null, recommendation: null, reason: 'No documented mode.' }
  plan.protocol = []
  plan.pipeline = []
  plan.features = []
  plan.neuralTarget = { signals: [], brainRegions: [], reason: 'Deferred pending evidence.' }
  assert.ok(prototypePlanSchema.safeParse(plan).success)
  assert.deepEqual(validateScientificPlan(plan, context), [])
})

for (const [label, mutate, expected] of [
  ['invented electrode', (p: ReturnType<typeof validPlan>) => { p.electrodes.recommended = ['ImaginarySite'] }, 'lacks a reviewed'],
  ['invented classifier', (p: ReturnType<typeof validPlan>) => { p.classifier = { name: 'Unretrieved decoder', reason: 'Invented' } }, 'lacks a reviewed'],
  ['invented hardware', (p: ReturnType<typeof validPlan>) => { p.hardware.deviceKey = 'imaginary-device' }, 'no reviewed'],
  ['invented sampling mode', (p: ReturnType<typeof validPlan>) => { p.sampling.rateHz = 1000; p.sampling.recommendation = '1000 Hz' }, 'not a documented'],
  ['invented citation', (p: ReturnType<typeof validPlan>) => { p.claims[0].sourceIds = ['doi:invented'] }, 'unknown source'],
  ['invented graph hop', (p: ReturnType<typeof validPlan>) => { p.reasoningPath[0].to = 'Invented signal' }, 'differs from'],
  ['fabricated observation', (p: ReturnType<typeof validPlan>) => { p.claims[0].kind = 'experimental_observation' }, 'No experimental records'],
  ['fabricated accuracy', (p: ReturnType<typeof validPlan>) => { p.summary = 'This design delivers 99% accuracy.' }, 'Unsupported performance'],
  ['fake complete', (p: ReturnType<typeof validPlan>) => { p.status = 'complete' }, 'Complete plans require'],
] as const) {
  test(`scientific checks reject ${label}`, () => {
    const plan = validPlan()
    mutate(plan)
    assert.ok(validateScientificPlan(plan, context).some(issue => issue.includes(expected)), expected)
  })
}

test('unverified legacy assertions cannot become scientific evidence', () => {
  const legacy = retrieveContext(SEED_GRAPH, { paradigm: 'meditation-alpha' })
  const plan = buildFallbackPlan({ ...input, context: legacy })
  const edge = legacy.relationships[0]
  plan.claims.push({ section: 'paradigm', statement: 'Legacy assertion', kind: 'scientific_evidence', relationshipIds: [edge.id!], sourceIds: edge.sourceIds! })
  assert.ok(validateScientificPlan(plan, legacy).some(issue => issue.includes('reviewed external')))
})

test('technical overcommitment and modality conflicts are rejected', () => {
  const plan = validPlan()
  const limited = { ...context, requirements: { ...context.requirements, availableChannels: 2 } }
  assert.ok(validateScientificPlan(plan, limited).some(issue => issue.includes('available channels')))
  plan.modality = 'fNIRS'
  assert.ok(validateScientificPlan(plan, context).some(issue => issue.includes('non-EEG')))
})

test('generation repairs scientific failures with feedback, or discloses failure after one repair', async () => {
  const unsupported = validPlan()
  unsupported.claims[0].sourceIds = ['invented']
  let calls = 0
  const repaired = await generatePlanWithLLM(input, { model: 'mock', complete: async messages => {
    calls++
    if (calls === 2) assert.match(messages[3].content, /unknown source/)
    return { finishReason: 'stop', content: JSON.stringify(calls === 1 ? unsupported : validPlan()) }
  } })
  assert.equal(repaired.status, 'success')
  assert.equal(repaired.attempts, 2)
  const failed = await generatePlanWithLLM(input, { model: 'mock', complete: async () => ({ finishReason: 'stop', content: JSON.stringify(unsupported) }) })
  assert.equal(failed.status, 'failed')
  if (failed.status === 'failed') assert.equal(failed.failure.code, 'scientific_validation')
})

test('complete and partial model results survive orchestration with backend-authoritative sources', async () => {
  for (const plan of [completePlan(), validPlan()]) {
    const result = await designObjective(designRequestSchema.parse({ goal: input.goal }), {
      retrieve: async () => context,
      model: { model: 'mock', complete: async messages => ({ finishReason: 'stop', content: JSON.stringify(messages[0].content.includes('INTERPRET_OBJECTIVE') ? fixtureInterpretation : plan) }) },
    })
    assert.ok(!('error' in result))
    if ('error' in result) continue
    assert.equal(result.meta.generator, 'llm')
    assert.equal(result.plan.status, plan.status)
    assert.deepEqual(result.meta.sources, context.sources)
  }
})

test('unknown, missing, incompatible and conflicting objectives return honest states without synthesis', async () => {
  for (const [request, status] of [
    [{ goal: 'Build a brain interface for an unspecified purpose.' }, 'clarification_required'],
    [{ goal: 'Build a P300 speller for typing letters.' }, 'insufficient_evidence'],
    [{ goal: 'Explore motor imagery with fNIRS only.', modality: 'fNIRS' }, 'unsupported'],
    [{ goal: 'Explore motor imagery with EEG.', constraints: 'I only have 2 channels but need 8 channels.' }, 'clarification_required'],
  ] as const) {
    const result = await designObjective(designRequestSchema.parse(request), { model: null, retrieve: offlineRetrieve })
    assert.ok(!('error' in result), JSON.stringify(result))
    if ('error' in result) continue
    assert.equal(result.plan.status, status)
    assert.equal(result.meta.attempts, 0)
    assert.equal(result.plan.classifier, null)
    assert.deepEqual(result.plan.electrodes.recommended, [])
  }
})

test('interpretation refusal never triggers catalog fallback', async () => {
  const result = await designObjective(designRequestSchema.parse({ goal: input.goal }), {
    model: { model: 'mock', complete: async () => ({ finishReason: 'content_filter', content: null }) },
    retrieve: async () => { assert.fail('Retrieval must not run after refusal') },
  })
  assert.ok('error' in result)
  if ('error' in result) assert.equal(result.error.code, 'MODEL_REFUSED')
})

test('literal fNIRS-only requirement cannot be overridden by an EEG model interpretation', async () => {
  const result = await designObjective(designRequestSchema.parse({ goal: 'Explore motor imagery.', hardware: 'A fNIRS-only system' }), {
    retrieve: offlineRetrieve,
    model: { model: 'mock', complete: async messages => {
      assert.match(messages[0].content, /INTERPRET_OBJECTIVE/)
      return { finishReason: 'stop', content: JSON.stringify(fixtureInterpretation) }
    } },
  })
  assert.ok(!('error' in result))
  if ('error' in result) return
  assert.equal(result.plan.status, 'unsupported')
  assert.equal(result.plan.modality, 'fNIRS')
  assert.deepEqual(result.plan.electrodes.recommended, [])
})

test('real source ID attached to the wrong technical section is rejected', () => {
  const plan = validPlan()
  plan.claims.push({ section: 'classifier', statement: 'A decoder assertion with unrelated evidence.', kind: 'scientific_evidence', sourceIds: ['fixture:manufacturer'], relationshipIds: ['fixture:hardware'] })
  assert.ok(validateScientificPlan(plan, context).some(issue => issue.includes('different technical section')))
})

test('hardware claims cannot invent capacity or an undocumented sampling mode', () => {
  const plan = validPlan()
  plan.hardware.requirements = ['The selected device supports 128 channels at 4000 Hz.']
  const issues = validateScientificPlan(plan, context)
  assert.ok(issues.some(issue => issue.includes('manufacturer specification')))
  assert.ok(issues.some(issue => issue.includes('undocumented sampling')))
})

test('publication citations alone do not establish manufacturer hardware specifications', () => {
  const plan = validPlan()
  const withoutManufacturer = { ...context, sources: context.sources.filter(source => source.kind !== 'manufacturer_specification') }
  assert.ok(validateScientificPlan(plan, withoutManufacturer).some(issue => issue.includes('no reviewed retrieved configuration')))
})

test('invented datasets and relabeled synthetic data cannot reach a plan', () => {
  const plan = validPlan()
  plan.relevantDatasets = [{ name: 'Imagined benchmark', url: 'https://example.com/not-a-real-bci-dataset', synthetic: false, why: 'Invented' }]
  assert.ok(validateScientificPlan(plan, context).some(issue => issue.includes('Dataset attribution')))
})

test('clear objectives outside the taxonomy return insufficient evidence, not a forced match', async () => {
  const result = await designObjective(designRequestSchema.parse({ goal: 'Build an intracortical speech decoding prototype.' }), {
    retrieve: offlineRetrieve,
    model: { model: 'mock', complete: async messages => {
      assert.match(messages[0].content, /INTERPRET_OBJECTIVE/)
      return { finishReason: 'stop', content: JSON.stringify({ summary: 'Intracortical speech decoding', paradigm: 'other', candidates: ['other'], modality: 'unknown', questions: [] }) }
    } },
  })
  assert.ok(!('error' in result))
  if ('error' in result) return
  assert.equal(result.plan.status, 'insufficient_evidence')
  assert.equal(result.meta.coverage.status, 'missing')
  assert.equal(result.meta.attempts, 0)
})
