import { Panel } from '@/components/dashboard/panel'
import type { RelevantDataset } from '@/types/neuropilot'

/**
 * Secondary, lower-priority panel: catalog datasets, rendered only when the
 * plan actually recommends one.
 */
export function DatasetsPanel({
  datasets,
  className = '',
}: {
  datasets: RelevantDataset[]
  className?: string
}) {
  if (datasets.length === 0) return null

  return (
    <Panel eyebrow="Dataset catalog" title="Relevant Public Data" className={className}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {datasets.map((dataset) => (
          <div
            key={dataset.name}
            className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-950/60 p-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold leading-snug text-zinc-100">{dataset.name}</p>
              {dataset.synthetic ? (
                <span className="shrink-0 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-300">
                  Synthetic
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-zinc-500">
              {dataset.why}
            </p>
            <a
              href={dataset.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 inline-flex items-center gap-1 font-mono text-[11px] text-cyan-400 transition-colors hover:text-cyan-300 focus-visible:ring-2 focus-visible:ring-cyan-500/40"
            >
              Source <span aria-hidden="true">↗</span>
            </a>
          </div>
        ))}
      </div>
    </Panel>
  )
}
