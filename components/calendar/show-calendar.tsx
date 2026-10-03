'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { addMonths } from '@/lib/dates'
import { createLocalSource, remoteSource, resetLocalData, type DataMode } from '@/lib/data-source'
import type { Show, ShowInput } from '@/lib/shows'
import { CalendarHeader, Legend } from './calendar-header'
import { MonthGrid } from './month-grid'
import { ShowDialog } from './show-dialog'
import { SummaryBar } from './summary-bar'
import { TableView } from './table-view'

type Editor = { show?: Show; date: string; key: number }
type View = 'calendar' | 'table'

export function ShowCalendar({ mode, todayISO }: { mode: DataMode; todayISO: string }) {
  const thisMonth = todayISO.slice(0, 7)
  const [ym, setYm] = useState(thisMonth)
  const [view, setView] = useState<View>('calendar')
  const [editor, setEditor] = useState<Editor | null>(null)
  const source = useMemo(() => (mode === 'remote' ? remoteSource : createLocalSource(thisMonth)), [mode, thisMonth])

  const { data, error, isValidating, mutate } = useSWR(['month', mode, ym], () => source.getMonth(ym), {
    refreshInterval: 30_000,
    keepPreviousData: true,
  })

  const shows = data?.shows ?? []
  const target = data?.target ?? null

  const openAdd = (date: string) => setEditor({ date, key: Date.now() })
  const openEdit = (show: Show) => setEditor({ show, date: show.date, key: Date.now() })

  const handleSave = async (input: ShowInput) => {
    await source.saveShow(input)
    setEditor(null)
    await mutate()
  }

  const handleDelete = async (id: string) => {
    await source.deleteShow(id)
    setEditor(null)
    await mutate()
  }

  const handleSaveTarget = async (value: number) => {
    await mutate(
      async () => {
        await source.saveTarget(ym, value)
        return source.getMonth(ym)
      },
      { optimisticData: { shows, target: value }, rollbackOnError: true },
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-8 md:py-12">
      <CalendarHeader
        ym={ym}
        onToday={() => setYm(thisMonth)}
        onPrev={() => setYm((m) => addMonths(m, -1))}
        onNext={() => setYm((m) => addMonths(m, 1))}
        onAdd={() => openAdd(ym === thisMonth ? todayISO : `${ym}-01`)}
        view={view}
        onViewChange={setView}
      />

      <SummaryBar shows={shows} target={target} onSaveTarget={handleSaveTarget} />

      <div className="flex flex-col gap-4">
        {view === 'calendar' && <Legend syncing={isValidating} />}
        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error instanceof Error ? error.message : 'Could not load shows.'}
          </p>
        )}
        {view === 'calendar' ? (
          <MonthGrid ym={ym} todayISO={todayISO} shows={shows} onAdd={openAdd} onOpen={openEdit} />
        ) : (
          <TableView ym={ym} shows={shows} onOpen={openEdit} />
        )}
      </div>

      {editor && (
        <ShowDialog
          key={editor.key}
          show={editor.show}
          date={editor.date}
          onClose={() => setEditor(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      {mode === 'local' && (
        <div className="fixed bottom-4 left-4 z-10 flex items-center gap-3 rounded-full border border-neutral-200 bg-white/95 py-1.5 pl-4 pr-1.5 text-xs text-neutral-500 shadow-sm backdrop-blur">
          <span>Preview: data saved in this browser</span>
          <button
            type="button"
            onClick={async () => {
              resetLocalData()
              await mutate()
            }}
            className="rounded-full px-2.5 py-1 font-medium text-neutral-800 hover:bg-neutral-100"
          >
            Reset
          </button>
        </div>
      )}
    </main>
  )
}
