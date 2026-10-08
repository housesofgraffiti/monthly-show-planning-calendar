import { cn } from '@/lib/utils'
import type { Show } from '@/lib/shows'
import { MIX_KEYS, mixCounts, type MixKey } from '@/lib/planning'
import { CATEGORY_STYLES } from './category-styles'

type Props = {
  shows: Show[]
  highlight: MixKey | null
  onHighlight: (key: MixKey | null) => void
}

export function MixStrip({ shows, highlight, onHighlight }: Props) {
  const counts = mixCounts(shows)

  return (
    <div role="group" aria-label="Show mix. Select one to highlight those shows on the calendar." data-tour="mix" className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm text-neutral-500">Mix</span>
      {MIX_KEYS.map((key) => {
        const active = highlight === key
        const count = counts[key]
        const dot = key === 'Core' || key === 'Premium' || key === 'Special' ? CATEGORY_STYLES[key].dot : null
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            disabled={count === 0 && !active}
            onClick={() => onHighlight(active ? null : key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40',
              active
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50',
            )}
          >
            {dot && <span aria-hidden className={cn('size-2 rounded-full', dot)} />}
            <span>{key}</span>
            <span className={cn('font-semibold tabular-nums', active ? 'text-white' : 'text-neutral-900')}>{count}</span>
          </button>
        )
      })}
    </div>
  )
}
