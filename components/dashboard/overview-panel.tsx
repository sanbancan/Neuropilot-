import type { ReactNode } from 'react'

import { Chip, Panel } from '@/components/dashboard/panel'
import type { DashboardViewModel } from '@/lib/dashboard/insights'
import type { PrototypePlan } from '@/types/neuropilot'

/** Compact definition list of what the prototype is, at a glance. */
export function OverviewPanel({
  plan,
  view,
  className = '',
}: {
  plan: PrototypePlan
  view: DashboardViewModel
  className?: string
}) {
  return (
    <Panel eyebrow="Overview" title="Prototype Overview" className={className}>
      <dl className="space-y-2.5">
        <Row label="Paradigm" value={plan.paradigm.name} />
        <Row label="Neural target" value={plan.neuralTarget.signals.join(' · ')} />
        <Row label="Brain region" value={plan.neuralTarget.brainRegions.join(' · ')} />
        <Row
          label="Electrodes"
          value={
            <div className="flex flex-wrap justify-end gap-1.5">
              {plan.electrodes.recommended.map((electrode) => (
                <Chip key={electrode}>{electrode}</Chip>
              ))}
            </div>
          }
        />
        <Row label="Classifier" value={plan.classifier.name} />
        <Row label="Minimum setup" value={view.minimumSetup} />
        <Row label="Likely bottleneck" value={view.bottleneck} />
      </dl>
      <p className="mt-3 line-clamp-2 border-t border-zinc-800/80 pt-3 text-xs leading-relaxed text-zinc-500">
        {view.summaryLead}
      </p>
    </Panel>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-xs font-medium leading-relaxed text-zinc-200">
        {value}
      </dd>
    </div>
  )
}
