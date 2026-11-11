import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { BciDashboard } from '@/components/dashboard/bci-dashboard'
import { buildFallbackPlan } from '@/lib/ai/fallback'
import { designObjective } from '@/lib/ai/design'
import { validateScientificPlan } from '@/lib/ai/validate-plan'
import { ModelProviderError } from '@/lib/ai/providers/errors'
import { retrieveContext } from '@/lib/graph/retrieve'
import { SEED_GRAPH } from '@/lib/graph/seed-data'
import { designRequestSchema, type PrototypePlan } from '@/lib/schemas/design'

const request = designRequestSchema.parse({ goal: 'Design a left versus right hand motor imagery experiment.', modality: 'EEG' })
const context = retrieveContext(SEED_GRAPH, { paradigm: 'motor-imagery', modality: 'EEG' })
const question = 'Which acquisition device and channel configuration will you use?'
const interpretation = { summary: request.goal, paradigm: 'motor-imagery', candidates: ['motor-imagery'], modality: 'EEG', questions: [question] }

/** Mock model output assembled only for tests; production synthesis remains the model's job. */
function proposedPlan(ctx = context): PrototypePlan {
  const plan = buildFallbackPlan({ ...request, context: ctx })
  plan.status = 'partial'
  plan.title = 'Personalized left versus right hand proposal'
  plan.summary = 'Proposed architecture for the requested two-class experiment; catalog-derived choices need review.'
  plan.questions = [question]
  plan.gaps = ['Acquisition device and independently reviewed protocol remain unresolved.']
  plan.limitations = ['Provisional engineering choices are not independently verified or experimentally validated.']
  plan.neuralTarget = { signals: ctx.signals.map(n => n.name), brainRegions: ctx.brainRegions.map(n => n.name), reason: 'Provisional targets from retrieved motor-imagery relationships.' }
  plan.electrodes = { recommended: ctx.electrodes.map(n => n.name), reason: 'Candidate sites; reference, ground and device suitability require review.' }
  plan.pipeline = ctx.processingMethods.map(n => ({ title: n.name, detail: `Proposed ${n.name} stage; parameters require project-specific review.` }))
  plan.features = ctx.features.map(n => n.name)
  plan.classifier = { name: ctx.classifiers[0].name, reason: 'Provisional catalog candidate; compare using a proposed evaluation.' }
  plan.validation = ['Propose Cross-Validation; results have not been measured.']
  plan.protocol = [{ title: 'Prepare the two-class experiment', detail: 'Proposed engineering sequence; confirm acquisition before data collection. No trial timing is established.' }]
  plan.claims = []
  const add = (section: PrototypePlan['claims'][number]['section'], key: string, statement: string, forceProvisional = false) => {
    const edge = ctx.relationships.find(e => e.fromKey === key || e.toKey === key)!
    plan.claims.push({ section, statement, kind: !forceProvisional && edge.verification === 'reviewed' ? 'engineering_recommendation' : 'provisional_engineering_recommendation', sourceIds: edge.sourceIds!, relationshipIds: [edge.id!] })
  }
  for (const n of [...ctx.signals, ...ctx.brainRegions]) add('neuralTarget', n.key, `Proposed ${n.name}`)
  for (const n of ctx.electrodes) add('electrodes', n.key, `Candidate ${n.name}`)
  for (const n of ctx.processingMethods) add('pipeline', n.key, `Proposed ${n.name}`)
  for (const n of ctx.features) add('features', n.key, `Proposed ${n.name}`)
  add('classifier', ctx.classifiers[0].key, 'Provisional decoder')
  add('validation', ctx.validationMethods[0].key, 'Proposed evaluation')
  add('protocol', ctx.processingMethods[0].key, 'Prepare the two-class experiment: provisional engineering sequence.', true)
  return plan
}

for (const model of ['openai/gpt-4o-mini', 'anthropic/claude-mock', 'google/gemini-mock']) {
  test(`mock ${model} synthesizes useful MI architecture despite a clarification question`, async () => {
    const plan = proposedPlan()
    let calls = 0
    const result = await designObjective(request, { retrieve: async () => context, model: { model, complete: async messages => {
      calls++
      return { finishReason: 'stop', content: JSON.stringify(messages[0].content.includes('INTERPRET_OBJECTIVE') ? interpretation : plan) }
    } } })
    assert.equal(calls, 2)
    assert.ok(!('error' in result))
    if ('error' in result) return
    assert.equal(result.meta.generator, 'llm')
    assert.equal(result.meta.model, model)
    assert.deepEqual(result.meta.diagnostics, { synthesis: 'succeeded', gate: 'eligible', validationCategories: [] })
    assert.deepEqual(result.plan, JSON.parse(JSON.stringify(plan)))
    assert.equal(result.plan.sampling.rateHz, null)
    for (const value of [plan.neuralTarget.signals, plan.electrodes.recommended, plan.pipeline, plan.features, plan.validation]) assert.ok(value.length)
    assert.ok(plan.classifier)
    const html = renderToStaticMarkup(<BciDashboard response={result} />)
    for (const value of [...plan.neuralTarget.signals, ...plan.electrodes.recommended, ...plan.features, plan.classifier!.name, question, 'Provisional engineering proposal', 'AI-generated proposal']) assert.ok(html.includes(value), value)
    assert.doesNotMatch(html, /Catalog starting point assembled/)
  })
}

test('catalog coverage distinguishes provisional context from absent protocol evidence', () => {
  for (const section of ['neuralTarget', 'electrodes', 'pipeline', 'classifier', 'validation']) assert.ok(context.coverage.provisionalSections?.includes(section))
  assert.ok(!context.coverage.provisionalSections?.includes('protocol'))
  assert.equal(context.protocols.length, 0)
  assert.deepEqual(validateScientificPlan(proposedPlan(), context), [])
})

test('a known compatible objective with clarification can retain technical proposals', () => {
  const plan = proposedPlan()
  plan.status = 'clarification_required'
  assert.deepEqual(validateScientificPlan(plan, context), [])
  plan.questions = []
  assert.ok(validateScientificPlan(plan, context).some(i => i.includes('must include questions')))
})

test('unreviewed catalog context can power synthesis without being promoted to reviewed evidence', async () => {
  const graph = structuredClone(SEED_GRAPH)
  graph.edges.forEach(e => { e.verification = 'unverified' })
  const ctx = retrieveContext(graph, { paradigm: 'motor-imagery', modality: 'EEG' })
  assert.equal(ctx.coverage.reviewedRelationships, 0)
  const plan = proposedPlan(ctx)
  const result = await designObjective({ ...request, modality: ctx.modality as 'EEG' | 'fNIRS' }, { retrieve: async () => ctx, model: { model: 'mock', complete: async messages => ({ finishReason: 'stop', content: JSON.stringify(messages[0].content.includes('INTERPRET_OBJECTIVE') ? interpretation : plan) }) } })
  assert.ok(!('error' in result))
  if (!('error' in result)) assert.equal(result.meta.generator, 'llm')
})

for (const kind of ['scientific_evidence', 'engineering_recommendation'] as const) {
  test(`unverified signal cannot be relabeled ${kind}`, () => {
    const plan = proposedPlan()
    plan.claims.find(c => c.section === 'neuralTarget')!.kind = kind
    assert.ok(validateScientificPlan(plan, context).length)
  })
}

test('reviewed CSP provenance cannot launder unverified band-power features', () => {
  const plan = proposedPlan()
  plan.claims = plan.claims.filter(c => c.section !== 'features' || c.kind !== 'provisional_engineering_recommendation')
  assert.ok(validateScientificPlan(plan, context).some(i => i.startsWith('features: Band Power')))
})

test('derived protocol cannot claim to be reviewed merely by citing a processing relationship', () => {
  const plan = proposedPlan()
  plan.claims.find(c => c.section === 'protocol')!.kind = 'engineering_recommendation'
  assert.ok(validateScientificPlan(plan, context).some(i => i.includes('protocol')))
})

for (const failure of ['api', 'schema', 'science'] as const) {
  test(`${failure} failure yields an honest catalog fallback and safe diagnostic categories`, async () => {
    const invalid = proposedPlan()
    invalid.claims[0].sourceIds = ['sensitive-user-text-not-for-diagnostics']
    const result = await designObjective(request, { retrieve: async () => context, model: { model: 'mock-configured', complete: async messages => {
      if (messages[0].content.includes('INTERPRET_OBJECTIVE')) return { finishReason: 'stop', content: JSON.stringify(interpretation) }
      if (failure === 'api') throw new ModelProviderError('provider_unavailable')
      return { finishReason: 'stop', content: failure === 'schema' ? '{}' : JSON.stringify(invalid) }
    } } })
    assert.ok(!('error' in result))
    if ('error' in result) return
    assert.equal(result.meta.generator, 'fallback')
    assert.equal(result.meta.model, null)
    assert.equal(result.meta.fallbackReason?.code, failure === 'api' ? 'provider_unavailable' : failure === 'schema' ? 'invalid_schema' : 'scientific_validation')
    assert.equal(result.meta.diagnostics?.synthesis, 'failed')
    if (failure !== 'api') assert.ok(result.meta.diagnostics?.validationCategories.includes(failure === 'schema' ? 'schema' : 'provenance'))
    assert.doesNotMatch(JSON.stringify(result.meta), /sensitive-user-text/)
    assert.match(result.plan.summary, /Deterministic catalog/)
  })
}

test('unsupported and insufficient evidence remain explicit synthesis gates', async () => {
  for (const [paradigm, modality, gate] of [['p300', 'EEG', 'missing_knowledge'], ['motor-imagery', 'fNIRS', 'incompatible_modality']] as const) {
    const ctx = retrieveContext(SEED_GRAPH, { paradigm, modality })
    const result = await designObjective({ ...request, modality: ctx.modality as 'EEG' | 'fNIRS' }, { retrieve: async () => ctx, model: { model: 'mock', complete: async messages => {
      assert.match(messages[0].content, /INTERPRET_OBJECTIVE/)
      return { finishReason: 'stop', content: JSON.stringify({ ...interpretation, paradigm, modality, questions: [] }) }
    } } })
    assert.ok(!('error' in result))
    if ('error' in result) continue
    assert.equal(result.meta.diagnostics?.synthesis, 'skipped')
    assert.equal(result.meta.diagnostics?.gate, gate)
    assert.deepEqual(result.plan.electrodes.recommended, [])
  }
})

test('fallback retains existing reviewed candidates while honestly keeping clarification and catalog origin', () => {
  const plan = buildFallbackPlan({ ...request, context, interpretation: { ...interpretation, paradigm: 'motor-imagery', candidates: ['motor-imagery'], modality: 'EEG' } })
  assert.equal(plan.status, 'partial')
  assert.ok(plan.features.includes('Common Spatial Patterns'))
  assert.ok(plan.questions.includes(question))
  assert.deepEqual(plan.neuralTarget.signals, [])
  assert.deepEqual(validateScientificPlan(plan, context), [])
  assert.match(plan.summary, /Deterministic catalog response/)
})

test('provisional recommendations cannot be presented as a complete reviewed plan', () => {
  const plan = proposedPlan()
  plan.status = 'complete'
  assert.ok(validateScientificPlan(plan, context).some(i => i.includes('unresolved provisional')))
})
