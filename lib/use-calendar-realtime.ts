'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

export type Viewer = { id: string; name: string; isSelf: boolean }

const CLIENT_ID_KEY = 'calendar-client-id'

function getClientId() {
  let id = localStorage.getItem(CLIENT_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(CLIENT_ID_KEY, id)
  }
  return id
}

type Options = {
  enabled: boolean
  name: string | null
  onChanged: () => void
}

export function useCalendarRealtime({ enabled, name, onChanged }: Options) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const onChangedRef = useRef(onChanged)
  const [viewers, setViewers] = useState<Viewer[]>([])

  useEffect(() => {
    onChangedRef.current = onChanged
  })

  useEffect(() => {
    if (!enabled) return
    const supabase = getSupabaseBrowser()
    if (!supabase) return

    const clientId = getClientId()
    const channel = supabase.channel('calendar', {
      config: { broadcast: { self: false }, presence: { key: clientId } },
    })

    channel.on('broadcast', { event: 'changed' }, () => onChangedRef.current())
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ name?: string }>()
      const next: Viewer[] = []
      for (const [id, metas] of Object.entries(state)) {
        const viewerName = metas[0]?.name
        if (viewerName) next.push({ id, name: viewerName, isSelf: id === clientId })
      }
      next.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
      setViewers(next)
    })
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED' && name) void channel.track({ name })
    })

    channelRef.current = channel
    return () => {
      channelRef.current = null
      setViewers([])
      void supabase.removeChannel(channel)
    }
  }, [enabled, name])

  const announceChange = useCallback(() => {
    void channelRef.current?.send({ type: 'broadcast', event: 'changed', payload: {} })
  }, [])

  return { viewers, announceChange }
}
