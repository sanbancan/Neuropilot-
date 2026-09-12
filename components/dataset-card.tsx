import type { RelevantDataset } from '@/types/neuropilot'

/** Card for a catalog dataset recommended only when genuinely relevant. */
export function DatasetCard({ dataset }: { dataset: RelevantDataset }) {
  return (
    <div className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-zinc-100">{dataset.name}</h4>
        {dataset.synthetic ? (
          <span className="shrink-0 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-300">
            Synthetic
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{dataset.why}</p>
      <a
        href={dataset.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs text-cyan-400 transition-colors hover:text-cyan-300 focus-visible:ring-2 focus-visible:ring-cyan-500/40"
      >
        View source <span aria-hidden="true">↗</span>
      </a>
    </div>
  )
}
