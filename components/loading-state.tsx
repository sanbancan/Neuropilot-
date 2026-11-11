/** Indeterminate request state; no timer-driven assertions about server progress. */
export function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Waiting for the NeuroPilot design response"
      className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8"
    >
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-cyan-400" />
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">
          Preparing your design response…
        </p>
      </div>
      <p className="mt-4 text-sm text-zinc-500">
        Waiting for the service to return a plan or a catalog starting point.
      </p>
    </div>
  )
}
