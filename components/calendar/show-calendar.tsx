'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { addMonths } from '@/lib/dates'
import { createLocalSource, remoteSource, resetLocalData, type DataMode } from '@/lib/data-source'
import { formatCurrency, type OtherRevenueInput, type Region, type SaveShowResult, type Show, type ShowInput } from '@/lib/shows'
import { useCalendarRealtime } from '@/lib/use-calendar-realtime'
import type { DayMarkerInput } from '@/lib/markers'
import { decideByFor, decisionsThisWeek, featuredInNames, type Send, type SendInput } from '@/lib/sends'
import { portalFor, type ImportResult } from '@/lib/portal'
import { planningSummary, typicalDiscovery, type MixKey } from '@/lib/planning'
import { CalendarHeader, Legend } from './calendar-header'
import { DecisionsThisWeek } from './decisions-this-week'
import { ImportPanel } from './import-panel'
import { MarkersDialog } from './markers-dialog'
import { MonthGrid } from './month-grid'
import { NamePrompt, useFirstName } from './name-prompt'
import { SendDialog } from './send-dialog'
import { ShowDialog } from './show-dialog'
import { SummaryBar } from './summary-bar'
import { TableView } from './table-view'

type Editor = { show?: Show; date: string; key: number }
type SendEditor = { send?: Send; date: string; key: number }
type View = 'calendar' | 'table'

export function ShowCalendar({ mode, todayISO }: { mode: DataMode; todayISO: string }) {
  const thisMonth = todayISO.slice(0, 7)
  const [ym, setYm] = useState(thisMonth)
  const [view, setView] = useState<View>('calendar')
  const [region, setRegion] = useState<Region | 'All'>(() => {
    if (typeof window === 'undefined') return 'All'
    const saved = window.localStorage.getItem('calendar-region')
    return saved === 'LA' || saved === 'Long Beach' || saved === 'Orange County' ? saved : 'All'
  })
  const [highlight, setHighlight] = useState<MixKey | null>(null)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [importing, setImporting] = useState(false)
  const [editingMarkers, setEditingMarkers] = useState(false)
  const [sendEditor, setSendEditor] = useState<SendEditor | null>(null)
  const [showSends, setShowSends] = useState(true)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const source = useMemo(() => (mode === 'remote' ? remoteSource : createLocalSource(thisMonth)), [mode, thisMonth])

  const { data, error, isValidating, mutate } = useSWR(['month', mode, ym], () => source.getMonth(ym), {
    refreshInterval: 30_000,
    keepPreviousData: true,
  })

  const { data: markers, mutate: mutateMarkers } = useSWR(['markers', mode, ym], () => source.getMarkers(ym), {
    keepPreviousData: true,
  })

  const { data: sendData, mutate: mutateSends } = useSWR(['sends', mode], () => source.getSends(), {
    keepPreviousData: true,
  })

  const { name: firstName, ready: nameReady, setName } = useFirstName()
  const { viewers, announceChange } = useCalendarRealtime({
    enabled: mode === 'remote' && Boolean(firstName),
    name: firstName,
    onChanged: () => {
      void mutate()
      void mutateMarkers()
      void mutateSends()
    },
  })

  const { data: typicalStat, error: typicalError } = useSWR(
    ['typical-discovery', mode],
    () => source.getTypicalDiscoveryRevenue(),
    { revalidateOnFocus: false },
  )
  const typical = typicalStat !== undefined ? typicalDiscovery(typicalStat) : typicalError ? typicalDiscovery(null) : null

  const shows = data?.shows ?? []
  const target = data?.target ?? null
  const otherRevenue = data?.otherRevenue ?? []
  const portal = data?.portal
  const visibleShows = region === 'All' ? shows : shows.filter((show) => show.region === region)
  const regionalSummary = region === 'All' ? null : planningSummary({ shows: visibleShows, portal, todayISO, other: 0, target })
  const sends = sendData ?? []
  const decisions = decisionsThisWeek(visibleShows, sends, todayISO)
  const changeRegion = (next: Region | 'All') => {
    setRegion(next)
    window.localStorage.setItem('calendar-region', next)
  }

  const openAdd = (date: string) => setEditor({ date, key: Date.now() })
  const openAddSend = (date: string) => setSendEditor({ date, key: Date.now() })
  const openSend = (send: Send) => setSendEditor({ send, date: send.date, key: Date.now() })
  const openEdit = (show: Show) => setEditor({ show, date: show.date, key: Date.now() })

  const handleSave = async (input: ShowInput): Promise<SaveShowResult> => {
    const result = await source.saveShow(input)
    if (result.status === 'conflict') return result
    setEditor(null)
    await mutate()
    announceChange()
    return result
  }

  const handleReload = async () => {
    const current = editor?.show
    if (!current) return
    const month = await source.getMonth(current.date.slice(0, 7))
    const fresh = month.shows.find((s) => s.id === current.id)
    if (!fresh) {
      setEditor(null)
    } else {
      setEditor({ show: fresh, date: fresh.date, key: Date.now() })
    }
    await mutate()
  }

  const handleDelete = async (id: string) => {
    await source.deleteShow(id)
    setEditor(null)
    await mutate()
    announceChange()
  }

  const handleSaveOther = async (input: OtherRevenueInput) => {
    await source.saveOtherRevenue(input)
    await mutate()
    announceChange()
  }

  const handleDeleteOther = async (id: string) => {
    await source.deleteOtherRevenue(id)
    await mutate()
    announceChange()
  }

  const handleCopyOther = async () => {
    const result = await source.copyOtherRevenue(ym)
    announceChange()
    return result
  }

  const handleSaveSend = async (input: SendInput) => {
    await source.saveSend(input)
    setSendEditor(null)
    await mutateSends()
    announceChange()
  }

  const handleDeleteSend = async (id: string) => {
    await source.deleteSend(id)
    setSendEditor(null)
    await mutateSends()
    announceChange()
  }

  const handleSaveMarker = async (input: DayMarkerInput) => {
    await source.saveMarker(input)
    await mutateMarkers()
    announceChange()
  }

  const handleDeleteMarker = async (id: string) => {
    await source.deleteMarker(id)
    await mutateMarkers()
    announceChange()
  }

  const handleImportDone = async (result: ImportResult) => {
    setImporting(false)
    const parts = [`Imported ${result.created}`, `linked ${result.linked}`]
    if (result.skipped > 0) parts.push(`skipped ${result.skipped}`)
    setImportMessage(parts.join(', '))
    window.setTimeout(() => setImportMessage(null), 6000)
    await mutate()
    announceChange()
  }

  const handleSaveTarget = async (value: number) => {
    await mutate(
      async () => {
        await source.saveTarget(ym, value)
        return source.getMonth(ym)
      },
      { optimisticData: { ...data, shows, otherRevenue, target: value }, rollbackOnError: true },
    )
    announceChange()
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
        region={region}
        onRegionChange={changeRegion}
        viewers={viewers}
        onViewChange={(next) => {
          setView(next)
          if (next === 'table') setHighlight(null)
        }}
      />

      <SummaryBar
        ym={ym}
        shows={shows}
        mixShows={visibleShows}
        regionLabel={regionalSummary ? `${region}: ${formatCurrency(regionalSummary.lockedIn)} locked in, ${formatCurrency(regionalSummary.projectedRemaining)} projected (${visibleShows.length} shows)` : undefined}
        target={target}
        otherRevenue={otherRevenue}
        portal={portal}
        todayISO={todayISO}
        typical={typical}
        highlight={highlight}
        onHighlight={setHighlight}
        onSaveTarget={handleSaveTarget}
        onSaveOther={handleSaveOther}
        onDeleteOther={handleDeleteOther}
        onCopyOther={handleCopyOther}
      />

      <div className="flex flex-col gap-4">
        {view === 'calendar' && <DecisionsThisWeek decisions={decisions} portal={portal} onOpen={openEdit} />}
        {view === 'calendar' && (
          <Legend
            syncing={isValidating}
            portalSyncedAt={data?.portalSyncedAt}
            onMarkers={() => setEditingMarkers(true)}
            showSends={showSends}
            onToggleSends={() => setShowSends((on) => !on)}
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
            shows={visibleShows}
            portal={portal}
            markers={markers ?? []}
            sends={sends}
            showSends={showSends}
            highlight={highlight}
            onAdd={openAdd}
            onAddSend={openAddSend}
            onOpen={openEdit}
            onOpenSend={openSend}
          />
        ) : (
          <TableView ym={ym} todayISO={todayISO} shows={visibleShows} portal={portal} sends={sends} onOpen={openEdit} />
        )}
      </div>

      {editor && (
        <ShowDialog
          key={editor.key}
          show={editor.show}
          date={editor.date}
          match={editor.show ? portalFor(editor.show, portal) : undefined}
          decideBy={editor.show ? decideByFor(editor.show, sends, todayISO) : null}
          featuredIn={editor.show ? featuredInNames(editor.show, sends) : []}
          getSuggestions={source.getPortalSuggestions}
          getMarkers={source.getMarkers}
          editorName={firstName ?? ''}
          onClose={() => setEditor(null)}
          onReload={editor.show ? handleReload : undefined}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      {nameReady && !firstName && <NamePrompt onSubmit={setName} />}

      {sendEditor && (
        <SendDialog
          key={sendEditor.key}
          send={sendEditor.send}
          date={sendEditor.date}
          getShowsRange={source.getShowsRange}
          onClose={() => setSendEditor(null)}
          onSave={handleSaveSend}
          onDelete={handleDeleteSend}
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
