import type { ReactNode } from 'react'

/**
 * Shared shell for one dashboard panel: eyebrow + title + content.
 * `className` carries the grid span so the container owns the layout.
 */
export function Panel({
  eyebrow,
  title,
  className = '',
  children,
}: {
  eyebrow: string
  title: string
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={`rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5 ${className}`}
    >
      <header className="mb-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400/70">
          {eyebrow}
        </p>
        <h3 className="mt-0.5 text-sm font-semibold tracking-tight text-zinc-100">{title}</h3>
      </header>
      {children}
    </section>
  )
}

/** Compact mono chip used for electrodes, signals, and structured values. */
export function Chip({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'accent'
}) {
  return (
    <span
      className={`rounded border px-2 py-0.5 font-mono text-xs ${
        tone === 'accent'
          ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
          : 'border-zinc-700 bg-zinc-950/80 text-zinc-300'
      }`}
    >
      {children}
    </span>
  )
}
