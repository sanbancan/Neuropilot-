import { Chip, Panel } from '@/components/dashboard/panel'
import type { PrototypePlan } from '@/types/neuropilot'

/** Where to record, which electrodes, and which signals to look for. */
export function ElectrodeSignalPanel({
  plan,
  className = '',
}: {
  plan: PrototypePlan
  className?: string
}) {
  return (
    <Panel eyebrow="Signal" title="Electrodes & Signals" className={className}>
      <dl className="space-y-3">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            Brain region
          </dt>
          <dd className="mt-1 text-sm font-semibold leading-snug text-zinc-100">
            {plan.neuralTarget.brainRegions.join(' · ')}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            Recommended electrodes
          </dt>
          <dd className="mt-1.5 flex flex-wrap gap-1.5">
            {plan.electrodes.recommended.map((electrode) => (
              <Chip key={electrode}>{electrode}</Chip>
            ))}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            Signals
          </dt>
          <dd className="mt-1.5 flex flex-wrap gap-1.5">
            {plan.neuralTarget.signals.map((signal) => (
              <Chip key={signal} tone="accent">
                {signal}
              </Chip>
            ))}
          </dd>
        </div>
      </dl>
      <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-zinc-500">
        {plan.electrodes.reason}
      </p>
    </Panel>
  )
}
