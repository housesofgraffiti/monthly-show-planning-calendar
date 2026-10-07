'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { addMonths } from '@/lib/dates'
import { createLocalSource, remoteSource, resetLocalData, type DataMode } from '@/lib/data-source'
import type { OtherRevenueInput, Show, ShowInput } from '@/lib/shows'
import type { DayMarkerInput } from '@/lib/markers'
import { portalFor, type ImportResult } from '@/lib/portal'
import { CalendarHeader, Legend } from './calendar-header'
import { ImportPanel } from './import-panel'
import { MarkersDialog } from './markers-dialog'
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
  const [importing, setImporting] = useState(false)
  const [editingMarkers, setEditingMarkers] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const source = useMemo(() => (mode === 'remote' ? remoteSource : createLocalSource(thisMonth)), [mode, thisMonth])

  const { data, error, isValidating, mutate } = useSWR(['month', mode, ym], () => source.getMonth(ym), {
    refreshInterval: 30_000,
    keepPreviousData: true,
  })

  const { data: markers, mutate: mutateMarkers } = useSWR(['markers', mode, ym], () => source.getMarkers(ym), {
    keepPreviousData: true,
  })

  const shows = data?.shows ?? []
  const target = data?.target ?? null
  const otherRevenue = data?.otherRevenue ?? []
  const portal = data?.portal

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

  const handleSaveOther = async (input: OtherRevenueInput) => {
    await source.saveOtherRevenue(input)
    await mutate()
  }

  const handleDeleteOther = async (id: string) => {
    await source.deleteOtherRevenue(id)
    await mutate()
  }

  const handleCopyOther = async () => {
    const result = await source.copyOtherRevenue(ym)
    return result
  }

  const handleSaveMarker = async (input: DayMarkerInput) => {
    await source.saveMarker(input)
    await mutateMarkers()
  }

  const handleDeleteMarker = async (id: string) => {
    await source.deleteMarker(id)
    await mutateMarkers()
  }

  const handleImportDone = async (result: ImportResult) => {
    setImporting(false)
    const parts = [`Imported ${result.created}`, `linked ${result.linked}`]
    if (result.skipped > 0) parts.push(`skipped ${result.skipped}`)
    setImportMessage(parts.join(', '))
    window.setTimeout(() => setImportMessage(null), 6000)
    await mutate()
  }

  const handleSaveTarget = async (value: number) => {
    await mutate(
      async () => {
        await source.saveTarget(ym, value)
        return source.getMonth(ym)
      },
      { optimisticData: { ...data, shows, otherRevenue, target: value }, rollbackOnError: true },
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
        onImport={mode === 'remote' ? () => setImporting(true) : undefined}
        view={view}
        onViewChange={setView}
      />

      <SummaryBar
        ym={ym}
        shows={shows}
        target={target}
        otherRevenue={otherRevenue}
        portal={portal}
        todayISO={todayISO}
        onSaveTarget={handleSaveTarget}
        onSaveOther={handleSaveOther}
        onDeleteOther={handleDeleteOther}
        onCopyOther={handleCopyOther}
      />

      <div className="flex flex-col gap-4">
        {view === 'calendar' && (
          <Legend
            syncing={isValidating}
            portalSyncedAt={data?.portalSyncedAt}
            onMarkers={() => setEditingMarkers(true)}
          />
        )}
        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error instanceof Error ? error.message : 'Could not load shows.'}
          </p>
        )}
        {view === 'calendar' ? (
          <MonthGrid
            ym={ym}
            todayISO={todayISO}
            shows={shows}
            portal={portal}
            markers={markers ?? []}
            onAdd={openAdd}
            onOpen={openEdit}
          />
        ) : (
          <TableView ym={ym} todayISO={todayISO} shows={shows} portal={portal} onOpen={openEdit} />
        )}
      </div>

      {editor && (
        <ShowDialog
          key={editor.key}
          show={editor.show}
          date={editor.date}
          match={editor.show ? portalFor(editor.show, portal) : undefined}
          getSuggestions={source.getPortalSuggestions}
          getMarkers={source.getMarkers}
          onClose={() => setEditor(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      {editingMarkers && (
        <MarkersDialog
          ym={ym}
          markers={markers ?? []}
          onSave={handleSaveMarker}
          onDelete={handleDeleteMarker}
          onClose={() => setEditingMarkers(false)}
        />
      )}

      {importing && (
        <ImportPanel
          ym={ym}
          getCandidates={source.getImportCandidates}
          onImport={(choices) => source.importFromPortal(ym, choices)}
          onClose={() => setImporting(false)}
          onDone={handleImportDone}
        />
      )}

      {importMessage && (
        <p
          role="status"
          className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg"
        >
          {importMessage}
        </p>
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
