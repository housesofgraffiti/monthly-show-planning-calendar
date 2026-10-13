'use client'

import type { OtherRevenueInput, OtherRevenueLine, Show } from '@/lib/shows'
import type { PortalMap } from '@/lib/portal'
import { planningSummary, type MixKey, type TypicalDiscovery } from '@/lib/planning'
import { MixStrip } from './mix-strip'
import { MonthGlance } from './month-glance'
import { OtherRevenuePanel } from './other-revenue-panel'

type Props = {
  ym: string
  shows: Show[]
  mixShows?: Show[]
  regionLabel?: string
  target: number | null
  otherRevenue: OtherRevenueLine[]
  portal?: PortalMap
  todayISO: string
  typical: TypicalDiscovery | null
  highlight: MixKey | null
  onHighlight: (key: MixKey | null) => void
  onSaveTarget: (value: number) => Promise<void>
  onSaveOther: (input: OtherRevenueInput) => Promise<void>
  onDeleteOther: (id: string) => Promise<void>
  onCopyOther: () => Promise<{ copied: number; skipped: number }>
}

export function SummaryBar({
  ym,
  shows,
  mixShows = shows,
  regionLabel,
  target,
  otherRevenue,
  portal,
  todayISO,
  typical,
  highlight,
  onHighlight,
  onSaveTarget,
  onSaveOther,
  onDeleteOther,
  onCopyOther,
}: Props) {
  const other = otherRevenue.reduce((sum, l) => sum + l.amount, 0)
  const s = planningSummary({ shows, portal, todayISO, other, target })

  return (
    <div className="flex flex-col gap-4">
      <MonthGlance ym={ym} summary={s} typical={typical} onSaveTarget={onSaveTarget} />
      <MixStrip shows={mixShows} highlight={highlight} onHighlight={onHighlight} />
      {regionLabel && <p className="px-1 text-sm text-neutral-500">{regionLabel}</p>}
      <OtherRevenuePanel ym={ym} lines={otherRevenue} onSave={onSaveOther} onDelete={onDeleteOther} onCopy={onCopyOther} />
    </div>
  )
}
