import type { PlanConfound } from '@/types/neuropilot'

/** Warning-style card for an artifact or confound, with optional mitigation. */
export function ConfoundCard({ confound }: { confound: PlanConfound }) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-0.5 text-sm text-amber-400">
          ⚠
        </span>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-zinc-100">{confound.name}</h4>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{confound.detail}</p>
          {confound.mitigation ? (
            <div className="mt-3 border-t border-amber-500/15 pt-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-400/80">
                Mitigation
              </p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-300">{confound.mitigation}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
