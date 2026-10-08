import { Mail, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Send, SendStatus } from '@/lib/sends'

const STATUS_STYLES: Record<SendStatus, string> = {
  Planned: 'border-dashed border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100',
  Scheduled: 'border-solid border-teal-300 bg-teal-100 text-teal-900 hover:bg-teal-200/70',
  Sent: 'border-solid border-transparent bg-neutral-100 text-neutral-500 hover:bg-neutral-200/70',
}

export function SendChips({ sends, onOpen }: { sends: Send[] | undefined; onOpen: (send: Send) => void }) {
  if (!sends?.length) return null
  return (
    <div data-tour="day-marker" className="flex flex-col gap-0.5">
      {sends.map((send) => {
        const Icon = send.channel === 'Email' ? Mail : MessageSquare
        return (
          <button
            key={send.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpen(send)
            }}
            title={[send.channel, send.segment, send.status].filter(Boolean).join(' · ')}
            aria-label={`${send.channel} send: ${send.name}, ${send.status}. Edit send`}
            className={cn(
              'flex w-full items-start gap-1 rounded border px-1.5 py-0.5 text-left text-[11px] font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900',
              STATUS_STYLES[send.status],
            )}
          >
            <Icon className="mt-px size-3 shrink-0" aria-hidden />
            <span className="min-w-0 whitespace-normal break-words">{send.name}</span>
          </button>
        )
      })}
    </div>
  )
}
