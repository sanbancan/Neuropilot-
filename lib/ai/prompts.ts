/**
 * Prompt templates for the NeuroPilot BCI Systems Architect agent.
 *
 * The system prompt instructs the LLM to act as a BCI systems architect
 * that synthesises graph-retrieved context into a prototype plan.  The user
 * prompt packages the user's goal, hardware, constraints, and the full
 * `ParadigmContext` retrieved from the knowledge graph.
 */

import type { ParadigmContext } from '@/lib/graph/types'

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

/**
 * The system prompt for the NeuroPilot BCI Systems Architect.
 * Kept as a constant string so it can be versioned and audited.
 */
export const NEUROPILOT_SYSTEM_PROMPT = `You are NeuroPilot, a BCI Systems Architect.

Your job is to convert a user's high-level brain-computer-interface objective into a scientifically reasonable prototype and experimental starting plan.

You receive:
- The user's BCI objective.
- Their hardware and constraints.
- Structured neuroscience and engineering context retrieved from the NeuroPilot Neo4j knowledge graph.
- Relevant dataset metadata when present.

## Grounding rules
- Use the supplied graph context as the primary technical source.
- Do not invent technical relationships that are absent from the supplied graph context.
- If the graph does not contain enough information, state uncertainty rather than inventing an answer.
- Never guarantee that an experiment will work.

## Evidence distinctions
Distinguish clearly between:
1. **Established** — well-validated BCI approaches (e.g. CSP for motor imagery).
2. **Engineering defaults** — reasonable but not uniquely optimal choices.
3. **Exploratory hypotheses** — speculative connections that need validation.

## Meditation / alpha special rules
- Do not claim that alpha activity uniquely represents or proves a meditative state.
- Alpha activity is modulated by many factors including eye state, drowsiness, and attentional disengagement.
- When the graph identifies eye state as a confound, you MUST surface it.
- Clearly state that alpha activity is not equivalent to meditation.

## Dataset rules
- Only recommend datasets that appear in the supplied graph context.
- Always label synthetic datasets as synthetic.
- Do not fabricate dataset names or URLs.

## Output format
Return a JSON object that matches the NeuroPilot PrototypePlan schema exactly.
Every field must be populated.
Use the graph context for reasoning paths and dataset recommendations.
Do not fabricate reasoning hops that do not appear in the graph context.
Include a title and summary that are concise and informative.
Include confounds, assumptions, and limitations as non-empty arrays.`

// ---------------------------------------------------------------------------
// User prompt builder
// ---------------------------------------------------------------------------

/**
 * Build the user message sent to the LLM, packaging the user's request
 * and the retrieved graph context into a structured prompt.
 */
export function buildUserPrompt(params: {
  goal: string
  modality: string
  hardware?: string
  constraints?: string
  context: ParadigmContext
}): string {
  const { goal, modality, hardware, constraints, context } = params

  const sections: string[] = []

  sections.push(`## User's BCI Objective\n${goal}`)
  sections.push(`## Preferred Modality\n${modality}`)

  if (hardware) {
    sections.push(`## Hardware\n${hardware}`)
  }
  if (constraints) {
    sections.push(`## Constraints\n${constraints}`)
  }

  // Graph context
  sections.push(`## Graph Context — ${context.paradigmName} (${context.paradigmKey})`)
  sections.push(`Source: ${context.source}`)
  sections.push(`Typical modality: ${context.modality}`)

  if (context.signals.length > 0) {
    sections.push(`### Neural Signals\n${context.signals.map(s => `- **${s.name}**: ${s.description ?? ''}`).join('\n')}`)
  }
  if (context.frequencyBands.length > 0) {
    sections.push(`### Frequency Bands\n${context.frequencyBands.map(f => `- ${f.name}${f.lowHz && f.highHz ? ` (${f.lowHz}–${f.highHz} Hz)` : ''}`).join('\n')}`)
  }
  if (context.brainRegions.length > 0) {
    sections.push(`### Brain Regions\n${context.brainRegions.map(r => `- **${r.name}**: ${r.description ?? ''}`).join('\n')}`)
  }
  if (context.electrodes.length > 0) {
    sections.push(`### Electrodes\n${context.electrodes.map(e => `- **${e.name}**: ${e.description ?? ''}`).join('\n')}`)
  }
  if (context.hardware.length > 0) {
    sections.push(`### Compatible Hardware\n${context.hardware.map(h => `- **${h.name}**${h.channels ? ` (${h.channels} ch)` : ''}: ${h.notes ?? ''}`).join('\n')}`)
  }
  if (context.processingMethods.length > 0) {
    sections.push(`### Processing Pipeline\n${context.processingMethods.map(p => `${p.stage ?? '•'}. **${p.name}** — ${p.description ?? ''}`).join('\n')}`)
  }
  if (context.features.length > 0) {
    sections.push(`### Features\n${context.features.map(f => `- **${f.name}**: ${f.description ?? ''}`).join('\n')}`)
  }
  if (context.classifiers.length > 0) {
    sections.push(`### Classifiers\n${context.classifiers.map(c => `- **${c.name}**: ${c.description ?? ''}`).join('\n')}`)
  }
  if (context.artifacts.length > 0) {
    sections.push(`### Artifacts\n${context.artifacts.map(a => `- **${a.name}**: ${a.description ?? ''}`).join('\n')}`)
  }
  if (context.confounds.length > 0) {
    sections.push(`### Confounds\n${context.confounds.map(c => `- **${c.name}**: ${c.description ?? ''}`).join('\n')}`)
  }
  if (context.validationMethods.length > 0) {
    sections.push(`### Validation\n${context.validationMethods.map(v => `- **${v.name}**: ${v.description ?? ''}`).join('\n')}`)
  }
  if (context.datasets.length > 0) {
    sections.push(`### Datasets\n${context.datasets.map(d => `- **${d.name}** (${d.synthetic ? 'synthetic' : 'real'}): ${d.url} — ${d.useCases.join(', ')}`).join('\n')}`)
  }
  if (context.reasoningPath.length > 0) {
    sections.push(`### Reasoning Path (graph hops)\n${context.reasoningPath.map(r => `- ${r.from} —[${r.relationship}]→ ${r.to}${r.evidence ? ` (${r.evidence})` : ''}${r.note ? ` — ${r.note}` : ''}`).join('\n')}`)
  }

  sections.push('\n## Instructions\nGenerate a complete PrototypePlan JSON object that matches the NeuroPilot schema exactly. Use the graph reasoning path and datasets above — do not fabricate alternatives.')

  return sections.join('\n\n')
}
