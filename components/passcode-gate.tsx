'use client'

import { useActionState } from 'react'
import { verifyPasscode } from '@/app/actions'

export function PasscodeGate() {
  const [state, action, pending] = useActionState(verifyPasscode, null)

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <form action={action} className="flex w-full max-w-sm flex-col gap-6 rounded-3xl border border-neutral-200 p-8">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">Sofar Sounds LA</p>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Show Calendar</h1>
          <p className="text-sm text-neutral-500">Enter the team passcode to continue.</p>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="passcode" className="text-sm font-medium text-neutral-700">
            Team passcode
          </label>
          <input
            id="passcode"
            name="passcode"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            aria-invalid={Boolean(state?.error)}
            aria-describedby={state?.error ? 'passcode-error' : undefined}
            className="h-12 rounded-xl border border-neutral-200 px-4 text-[15px] focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
          />
          {state?.error && (
            <p id="passcode-error" role="alert" className="text-sm text-red-600">
              {state.error}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="h-12 rounded-xl bg-neutral-900 text-[15px] font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          {pending ? 'Checking…' : 'Enter'}
        </button>
      </form>
    </main>
  )
}
