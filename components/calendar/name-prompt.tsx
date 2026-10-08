'use client'

import { useEffect, useRef, useState } from 'react'

const NAME_KEY = 'calendar-first-name'

export function useFirstName() {
  const [name, setNameState] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setNameState(localStorage.getItem(NAME_KEY))
    setReady(true)
  }, [])

  const setName = (value: string) => {
    localStorage.setItem(NAME_KEY, value)
    setNameState(value)
  }

  return { name, ready, setName }
}

export function NamePrompt({ onSubmit }: { onSubmit: (name: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [value, setValue] = useState('')

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const trimmed = value.trim()

  return (
    <dialog
      ref={ref}
      aria-labelledby="name-prompt-title"
      onCancel={(e) => e.preventDefault()}
      className="m-auto w-[calc(100%-1.5rem)] max-w-sm overflow-hidden rounded-3xl bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-neutral-900/30 backdrop:backdrop-blur-[2px]"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (trimmed) onSubmit(trimmed)
        }}
        className="flex flex-col gap-5 px-6 py-6 sm:px-8"
      >
        <div className="flex flex-col gap-1">
          <h2 id="name-prompt-title" className="text-xl font-semibold tracking-tight">
            What&apos;s your first name?
          </h2>
          <p className="text-sm text-neutral-500">
            Shown to teammates viewing the calendar, and next to your edits.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="name-prompt-input" className="text-sm font-medium text-neutral-700">
            First name
          </label>
          <input
            id="name-prompt-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={30}
            autoComplete="given-name"
            autoFocus
            required
            className="h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-[15px] outline-none transition-colors focus:border-neutral-900"
          />
        </div>
        <button
          type="submit"
          disabled={!trimmed}
          className="h-12 rounded-xl bg-neutral-900 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-60"
        >
          Continue
        </button>
      </form>
    </dialog>
  )
}
