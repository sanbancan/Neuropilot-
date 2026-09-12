'use client'

import { useId, useState, type FormEvent } from 'react'

import { designRequestSchema } from '@/lib/schemas/design'
import type { DesignRequest, ModalityInput } from '@/types/neuropilot'

const EXAMPLE_IDEAS = [
  {
    label: 'Distinguish imagined left vs. right-hand movement',
    goal: 'I want to distinguish imagined left-hand movement from imagined right-hand movement using EEG.',
  },
  {
    label: 'Build a visual-selection BCI using SSVEP',
    goal: 'I want to build a visual-selection BCI where I pick between flickering targets on a screen using SSVEP.',
  },
  {
    label: 'Explore EEG changes during meditation',
    goal: 'I want to investigate whether meditation changes EEG activity.',
  },
] as const

const MODALITY_OPTIONS: { value: ModalityInput; label: string }[] = [
  { value: 'EEG', label: 'EEG' },
  { value: 'fNIRS', label: 'fNIRS' },
  { value: 'unknown', label: "I don't know yet" },
]

const fieldLabelClasses =
  'block font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500'

const inputClasses =
  'mt-3 w-full rounded-lg border border-zinc-800 bg-zinc-950/70 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10'

interface BciInputFormProps {
  onSubmit: (request: DesignRequest) => void
  /** Pre-fills the form after "Design another BCI" / error returns. */
  initialRequest?: DesignRequest | null
}

export function BciInputForm({ onSubmit, initialRequest = null }: BciInputFormProps) {
  const [goal, setGoal] = useState(initialRequest?.goal ?? '')
  const [modality, setModality] = useState<ModalityInput>(initialRequest?.modality ?? 'unknown')
  const [hardware, setHardware] = useState(initialRequest?.hardware ?? '')
  const [constraints, setConstraints] = useState(initialRequest?.constraints ?? '')
  const [error, setError] = useState<string | null>(null)

  const goalId = useId()
  const hardwareId = useId()
  const constraintsId = useId()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsed = designRequestSchema.safeParse({
      goal,
      modality,
      hardware: hardware.trim() || undefined,
      constraints: constraints.trim() || undefined,
    })

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please describe your BCI idea first.')
      return
    }

    setError(null)
    onSubmit(parsed.data)
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8"
    >
      <div>
        <label htmlFor={goalId} className={fieldLabelClasses}>
          Your BCI idea <span className="normal-case tracking-normal text-zinc-600">(required)</span>
        </label>
        <textarea
          id={goalId}
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          rows={5}
          placeholder="I want to distinguish imagined left-hand movement from imagined right-hand movement using EEG."
          className="mt-3 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3.5 text-base leading-relaxed text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10"
        />
        {error ? (
          <p role="alert" className="mt-2 text-sm text-rose-400">
            {error}
          </p>
        ) : null}
      </div>

      <fieldset className="mt-7">
        <legend className={fieldLabelClasses}>
          Modality <span className="normal-case tracking-normal text-zinc-600">(optional)</span>
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {MODALITY_OPTIONS.map((option) => {
            const selected = modality === option.value
            return (
              <label
                key={option.value}
                className={`cursor-pointer rounded-lg border px-4 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cyan-500/40 ${
                  selected
                    ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-300'
                    : 'border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                }`}
              >
                <input
                  type="radio"
                  name="modality"
                  value={option.value}
                  checked={selected}
                  onChange={() => setModality(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="mt-7 grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor={hardwareId} className={fieldLabelClasses}>
            Existing hardware{' '}
            <span className="normal-case tracking-normal text-zinc-600">(optional)</span>
          </label>
          <input
            id={hardwareId}
            type="text"
            value={hardware}
            onChange={(event) => setHardware(event.target.value)}
            placeholder="OpenBCI Cyton, Muse, or 'I don't have hardware yet'"
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor={constraintsId} className={fieldLabelClasses}>
            Constraints <span className="normal-case tracking-normal text-zinc-600">(optional)</span>
          </label>
          <input
            id={constraintsId}
            type="text"
            value={constraints}
            onChange={(event) => setConstraints(event.target.value)}
            placeholder="I only have 8 channels, I am new to BCI…"
            className={inputClasses}
          />
        </div>
      </div>

      <button
        type="submit"
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:w-auto"
      >
        Design My BCI <span aria-hidden="true">→</span>
      </button>

      <div className="mt-8 border-t border-zinc-800/80 pt-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-600">
          Start from an example
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLE_IDEAS.map((idea) => (
            <button
              key={idea.label}
              type="button"
              onClick={() => {
                setGoal(idea.goal)
                setError(null)
              }}
              className="rounded-full border border-zinc-800 bg-zinc-950/60 px-4 py-1.5 text-xs text-zinc-400 transition-colors hover:border-cyan-500/50 hover:text-cyan-300 focus-visible:ring-2 focus-visible:ring-cyan-500/40"
            >
              {idea.label}
            </button>
          ))}
        </div>
      </div>
    </form>
  )
}
