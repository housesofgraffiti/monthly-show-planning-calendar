import type { Category } from '@/lib/shows'

export const CATEGORY_STYLES: Record<
  Category,
  { dot: string; card: string; sub: string; selected: string }
> = {
  Core: {
    dot: 'bg-emerald-500',
    card: 'bg-emerald-50 border-emerald-300 text-emerald-950 hover:bg-emerald-100/70',
    sub: 'text-emerald-900/70',
    selected: 'border-emerald-300 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200',
  },
  Premium: {
    dot: 'bg-violet-500',
    card: 'bg-violet-50 border-violet-300 text-violet-950 hover:bg-violet-100/70',
    sub: 'text-violet-900/70',
    selected: 'border-violet-300 bg-violet-50 text-violet-900 ring-2 ring-violet-200',
  },
  Special: {
    dot: 'bg-amber-500',
    card: 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100/70',
    sub: 'text-amber-900/70',
    selected: 'border-amber-300 bg-amber-50 text-amber-900 ring-2 ring-amber-200',
  },
}
