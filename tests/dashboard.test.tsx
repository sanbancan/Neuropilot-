import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { BciDashboard } from '@/components/dashboard/bci-dashboard'
import { LoadingState } from '@/components/loading-state'
import { buildDashboard } from '@/lib/dashboard/insights'
import { validResponse } from './fixtures'

for (const sampling of ['250 Hz', '200–250 Hz', 'up to 250 Hz', '1 kHz', '0.5–40 Hz band-pass; sampling 250 Hz']) {
  test(`dashboard preserves the entire specification: ${sampling}`, () => {
    const response = validResponse()
    response.plan.sampling.recommendation = sampling
    const view = buildDashboard(response.plan, response.meta)
    assert.equal(view.metrics.find(item => item.label === 'Sampling')?.value, sampling)
    assert.ok(renderToStaticMarkup(<BciDashboard response={response} />).includes(sampling))
  })
}

test('validated backend output reaches rendered dashboard without invented conclusions or advice', () => {
  const response = validResponse()
  const view = buildDashboard(response.plan, response.meta)
  const html = renderToStaticMarkup(<BciDashboard response={response} />)
  assert.equal(view.metrics.find(item => item.label === 'Electrodes')?.value, response.plan.electrodes.recommended.join(' · '))
  assert.equal(view.summaryLead, response.plan.summary)
  assert.equal(view.nextActions[0].action, response.plan.nextActions[0].action)
  for (const text of [
    response.plan.title, response.plan.summary, response.plan.paradigm.reason,
    response.plan.neuralTarget.reason, response.plan.classifier!.reason,
    response.plan.hardware.reason, response.plan.hardware.requirements[0],
    response.plan.nextActions[0].rationale, response.plan.assumptions[0], response.plan.limitations[0],
    response.plan.validation[0],
    response.plan.confounds[6].detail, 'No mitigation specified in this plan.',
    'AI-generated proposal', 'Proposed Validation', 'No experimental results are supplied.',
  ]) assert.ok(html.includes(text), text)
  assert.doesNotMatch(html, /Testable design|Lowest-risk|Most important caution|Minimum setup|Likely bottleneck|40 trials|Apply ICA|Start with|Record from/)
  assert.doesNotMatch(html, /✓/)
})

test('fallback displays its reason and catalog limitations prominently', () => {
  const response = validResponse()
  response.meta.generator = 'fallback'
  response.meta.model = null
  response.meta.fallbackReason = { code: 'api_error', message: 'The AI service request failed.' }
  const html = renderToStaticMarkup(<BciDashboard response={response} />)
  assert.match(html, /Deterministic catalog starting point/)
  assert.match(html, /The AI service request failed/)
  assert.match(html, /hardware suitability and constraints have not been evaluated/)
  assert.doesNotMatch(html, /AI-generated proposal/)
})

test('loading is indeterminate and never marks simulated stages as completed', () => {
  const html = renderToStaticMarkup(<LoadingState />)
  assert.match(html, /role="status"/)
  assert.match(html, /Waiting for the service/)
  assert.doesNotMatch(html, /✓|Searching NeuroPilot|Checking neural signals|aria-valuenow/)
})

for (const [status, label] of [
  ['complete', 'Complete design proposal'], ['partial', 'Partial design'],
  ['clarification_required', 'Clarification required'], ['unsupported', 'Unsupported requirements'],
  ['insufficient_evidence', 'Insufficient scientific evidence'],
] as const) {
  test(`dashboard communicates ${status} without hiding questions or provenance`, () => {
    const response = validResponse()
    response.plan.status = status
    response.plan.questions = ['What acquisition hardware is available?']
    response.plan.gaps = ['Montage evidence is unavailable.']
    response.plan.classifier = null
    response.plan.sampling = { rateHz: null, recommendation: null, reason: 'Awaiting device specifications.' }
    const html = renderToStaticMarkup(<BciDashboard response={response} />)
    assert.ok(html.includes(label))
    assert.match(html, /What acquisition hardware is available/)
    assert.match(html, /Montage evidence is unavailable/)
    assert.match(html, /Synthetic test-only source/)
    assert.match(html, /fixture:reviewed/)
    assert.match(html, /No supported decoder selected/)
    assert.doesNotMatch(html, /Testable design|Lowest-risk|Minimum setup/)
  })
}

test('provider identity and outage reason remain visible on a catalog response', () => {
  const response = validResponse()
  response.meta.generator = 'fallback'
  response.meta.model = null
  response.meta.fallbackReason = { code: 'provider_unavailable', message: 'The selected AI provider is unavailable. No automatic provider switch was made.' }
  response.meta.provider = {
    name: 'mia21', model: 'anthropic/claude-fixture', family: 'claude', outputMode: 'prompt',
    profileSource: 'conservative', discovery: 'cached',
    capabilities: { tools: true, streaming: true, webSearch: null, vision: null, documents: null },
    memory: 'disabled', toolExecution: 'disabled', liveEvaluated: false,
  }
  const html = renderToStaticMarkup(<BciDashboard response={response} />)
  assert.match(html, /mia21/)
  assert.match(html, /anthropic\/claude-fixture/)
  assert.match(html, /Configured: mia21/)
  assert.match(html, /No automatic provider switch was made/)
  assert.match(html, /Deterministic catalog starting point/)
})
