'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { driver, type Driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { TOUR_STEPS } from '@/lib/tour'

const SEEN_KEY = 'show-planner:tour-seen'

export function hasSeenTour() {
  try {
    return window.localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return true
  }
}

function markTourSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, '1')
  } catch {
    // The cookie below still remembers it.
  }
  // A server-set cookie survives storage purges and covers browsers that block localStorage.
  void fetch('/api/tour-seen', { method: 'POST' }).catch(() => {})
}

function firstVisible(selector: string) {
  for (const node of document.querySelectorAll<HTMLElement>(selector)) {
    const rect = node.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) return node
  }
  return null
}

function TourCards({ texts, onClose }: { texts: string[]; onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const last = index === texts.length - 1

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-neutral-900/50 p-4">
      <div role="dialog" aria-modal="true" aria-label="Tour" className="flex w-full flex-col gap-4 rounded-2xl bg-white p-5 shadow-2xl">
        <p className="text-xs font-medium text-neutral-500">
          Step {index + 1} of {texts.length}
        </p>
        <p className="text-pretty text-base leading-relaxed text-neutral-900">{texts[index]}</p>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg px-3 text-sm font-medium text-neutral-500 hover:bg-neutral-100"
          >
            Skip
          </button>
          <div className="flex gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex((i) => i - 1)}
                className="h-10 rounded-lg border border-neutral-200 px-4 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
              >
                Back
              </button>
            )}
            <button
              type="button"
              autoFocus
              onClick={() => (last ? onClose() : setIndex((i) => i + 1))}
              className="h-10 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800"
            >
              {last ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function useGuidedTour() {
  const driverRef = useRef<Driver | null>(null)
  const [cards, setCards] = useState<string[] | null>(null)

  const start = useCallback(() => {
    markTourSeen()
    driverRef.current?.destroy()

    const available = TOUR_STEPS.map((step) => ({ step, element: firstVisible(step.selector) })).filter(
      (entry): entry is { step: (typeof TOUR_STEPS)[number]; element: HTMLElement } => entry.element !== null,
    )
    if (available.length === 0) return

    if (window.matchMedia('(max-width: 767px)').matches) {
      setCards(available.map(({ step }) => step.text))
      return
    }

    const tour: Driver = driver({
      showProgress: true,
      progressText: 'Step {{current}} of {{total}}',
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Done',
      showButtons: ['previous', 'next'],
      stagePadding: 6,
      stageRadius: 12,
      overlayOpacity: 0.55,
      steps: available.map(({ step, element }) => ({
        element,
        popover: { description: step.text, side: step.side ?? 'bottom', align: 'center' },
      })),
      onPopoverRender: (popover) => {
        const skip = document.createElement('button')
        skip.type = 'button'
        skip.textContent = 'Skip'
        skip.className = 'driver-popover-skip-btn'
        skip.addEventListener('click', () => tour.destroy())
        popover.footerButtons.prepend(skip)
      },
    })
    driverRef.current = tour
    tour.drive()
  }, [])

  useEffect(() => () => driverRef.current?.destroy(), [])

  const closeCards = useCallback(() => setCards(null), [])
  const ui = cards ? <TourCards texts={cards} onClose={closeCards} /> : null

  return { start, ui }
}
