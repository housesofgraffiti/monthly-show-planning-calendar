import { cn } from '@/lib/utils'
import type { Viewer } from '@/lib/use-calendar-realtime'

const TONES = [
  'bg-teal-100 text-teal-900',
  'bg-amber-100 text-amber-900',
  'bg-sky-100 text-sky-900',
  'bg-rose-100 text-rose-900',
  'bg-emerald-100 text-emerald-900',
]

const MAX_SHOWN = 6

function toneFor(name: string) {
  let hash = 0
  for (const char of name.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return TONES[hash % TONES.length]
}

export function PresenceBubbles({ viewers }: { viewers: Viewer[] }) {
  if (viewers.length === 0) return null
  const shown = viewers.slice(0, MAX_SHOWN)
  const extra = viewers.length - shown.length

  return (
    <ul aria-label="People viewing now" className="flex items-center -space-x-1.5">
      {shown.map((viewer) => {
        const label = viewer.isSelf ? `${viewer.name} (you)` : viewer.name
        return (
          <li
            key={viewer.id}
            title={label}
            className={cn(
              'flex size-8 select-none items-center justify-center rounded-full text-xs font-semibold uppercase ring-2 ring-white',
              toneFor(viewer.name),
            )}
          >
            <span aria-hidden="true">{viewer.name.charAt(0)}</span>
            <span className="sr-only">{label}</span>
          </li>
        )
      })}
      {extra > 0 && (
        <li
          title={viewers
            .slice(MAX_SHOWN)
            .map((v) => v.name)
            .join(', ')}
          className="flex size-8 select-none items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700 ring-2 ring-white"
        >
          +{extra}
        </li>
      )}
    </ul>
  )
}
