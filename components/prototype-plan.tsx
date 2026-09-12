import type { ReactNode } from 'react'

import { ConfoundCard } from '@/components/confound-card'
import { DatasetCard } from '@/components/dataset-card'
import { Pipeline } from '@/components/pipeline'
import { ReasoningPath } from '@/components/reasoning-path'
import type { DesignResponse } from '@/types/neuropilot'

/** Renders the full engineering-style prototype report. */
export function PrototypePlan({ response }: { response: DesignResponse }) {
  const { plan, meta } = response

  return (
    <article>
      <header className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-400/70">
          Prototype plan
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">
          {plan.title}
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-400">{plan.summary}</p>
      </header>

      <Section eyebrow="Overview" title="Prototype Overview">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <OverviewCard label="BCI Paradigm" sub={plan.paradigm.reason}>
            {plan.paradigm.name}
          </OverviewCard>
          <OverviewCard label="Modality">{plan.modality}</OverviewCard>
          <OverviewCard label="Neural Target" sub={plan.neuralTarget.reason}>
            <ul className="space-y-1">
              {plan.neuralTarget.signals.map((signal) => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
          </OverviewCard>
          <OverviewCard label="Relevant Brain Region">
            {plan.neuralTarget.brainRegions.join(' · ')}
          </OverviewCard>
          <OverviewCard label="Recommended Electrodes" sub={plan.electrodes.reason}>
            <div className="flex flex-wrap gap-1.5">
              {plan.electrodes.recommended.map((electrode) => (
                <span
                  key={electrode}
                  className="rounded border border-zinc-700 bg-zinc-950/80 px-2 py-0.5 font-mono text-xs text-zinc-300"
                >
                  {electrode}
                </span>
              ))}
            </div>
          </OverviewCard>
          <OverviewCard label="Sampling Requirements" sub={plan.sampling.reason}>
            {plan.sampling.recommendation}
          </OverviewCard>
          <OverviewCard label="Hardware Requirements" sub={plan.hardware.reason}>
            {plan.hardware.requirements.length > 0 ? (
              <ul className="space-y-1.5">
                {plan.hardware.requirements.map((requirement) => (
                  <li key={requirement} className="flex gap-2">
                    <span aria-hidden="true" className="text-zinc-600">
                      ·
                    </span>
                    {requirement}
                  </li>
                ))}
              </ul>
            ) : (
              <p>None beyond your stated hardware.</p>
            )}
          </OverviewCard>
        </div>
      </Section>

      <Section eyebrow="Signal processing" title="Signal Processing Pipeline">
        <Pipeline steps={plan.pipeline} />
      </Section>

      <Section eyebrow="Experiment" title="Experimental Protocol">
        <ol className="grid gap-4 lg:grid-cols-2">
          {plan.protocol.map((step, index) => (
            <li key={step.title} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-cyan-400/80">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className="text-sm font-medium text-zinc-100">{step.title}</p>
              </div>
              <p className="mt-2 pl-8 text-sm leading-relaxed text-zinc-400">{step.detail}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section eyebrow="Feature extraction" title="Features">
        <div className="grid gap-4 sm:grid-cols-2">
          {plan.features.map((feature, index) => (
            <div
              key={feature}
              className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
            >
              <span className="font-mono text-xs text-cyan-400/80">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="text-sm leading-relaxed text-zinc-300">{feature}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Decision" title="Classifier & Validation">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Classifier
            </p>
            <p className="mt-2.5 text-base font-semibold text-zinc-100">{plan.classifier.name}</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{plan.classifier.reason}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Validation approach
            </p>
            <ul className="mt-3 space-y-2.5">
              {plan.validation.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-zinc-300">
                  <span aria-hidden="true" className="mt-0.5 text-cyan-400/80">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section eyebrow="Threats to validity" title="Artifacts & Confounds">
        <div className="grid gap-4 sm:grid-cols-2">
          {plan.confounds.map((confound) => (
            <ConfoundCard key={confound.name} confound={confound} />
          ))}
        </div>
      </Section>

      <Section eyebrow="Scientific honesty" title="Assumptions & Limitations">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Assumptions
            </p>
            <ul className="mt-3 space-y-2.5">
              {plan.assumptions.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-zinc-400">
                  <span aria-hidden="true" className="mt-2.5 h-px w-3 shrink-0 bg-cyan-500/60" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Limitations
            </p>
            <ul className="mt-3 space-y-2.5">
              {plan.limitations.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-zinc-400">
                  <span aria-hidden="true" className="mt-2.5 h-px w-3 shrink-0 bg-amber-500/60" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section eyebrow="Knowledge graph" title="Why did NeuroPilot recommend this?">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8">
          <ReasoningPath steps={plan.reasoningPath} />
        </div>
      </Section>

      <Section eyebrow="Dataset catalog" title="Relevant Public Data">
        {plan.relevantDatasets.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {plan.relevantDatasets.map((dataset) => (
              <DatasetCard key={dataset.name} dataset={dataset} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-5 py-4 text-sm text-zinc-500">
            No close dataset in the current catalog for this paradigm.
          </p>
        )}
      </Section>

      <footer className="mt-12 border-t border-zinc-800/80 pt-5 font-mono text-[11px] leading-relaxed tracking-wide text-zinc-600">
        Generated {formatTimestamp(meta.generatedAt)} · paradigm: {meta.paradigmKey} · graph:{' '}
        {meta.graphSource} · generator: {meta.generator}
        {meta.model ? ` · model: ${meta.model}` : ''}
      </footer>
    </article>
  )
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="mt-12">
      <div className="mb-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-400/70">
          {eyebrow}
        </p>
        <h3 className="mt-1 text-xl font-semibold tracking-tight text-zinc-100">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function OverviewCard({
  label,
  sub,
  children,
}: {
  label: string
  sub?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <div className="mt-2.5 text-sm font-medium leading-relaxed text-zinc-100">{children}</div>
      {sub ? <p className="mt-2 text-xs leading-relaxed text-zinc-500">{sub}</p> : null}
    </div>
  )
}

/** Locale-independent UTC formatting so server and client markup match. */
function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)} UTC`
}
