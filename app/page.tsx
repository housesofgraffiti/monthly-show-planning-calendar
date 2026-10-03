import { ShowCalendar } from '@/components/calendar/show-calendar'
import { PasscodeGate } from '@/components/passcode-gate'
import { isSupabaseConfigured } from '@/lib/supabase-admin'
import { PASSCODE_ENABLED, hasTeamAccess } from '@/lib/team-access'

function todayInLosAngeles() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export default async function Page() {
  const mode = isSupabaseConfigured() ? 'remote' : 'local'

  if (mode === 'remote' && PASSCODE_ENABLED) {
    if (!process.env.TEAM_PASSCODE) {
      return (
        <main className="flex min-h-dvh items-center justify-center px-4">
          <p className="max-w-sm text-center text-sm text-neutral-600">
            Set the <code className="rounded bg-neutral-100 px-1.5 py-0.5">TEAM_PASSCODE</code> environment variable to
            unlock the show calendar.
          </p>
        </main>
      )
    }
    if (!(await hasTeamAccess())) return <PasscodeGate />
  }

  return <ShowCalendar mode={mode} todayISO={todayInLosAngeles()} />
}
