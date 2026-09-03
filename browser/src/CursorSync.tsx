import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react'
import styled from 'styled-components'
import { RegionViewerContext } from '@gnomad/region-viewer'

// Context: one per group of synchronized cursors. Holds the current pixel-X and
// a pub/sub so each <SynchronizedCursor> updates its SVG line imperatively,
// avoiding a React re-render on every mouse-move.

type CursorSyncContextValue = {
  positionRef: React.MutableRefObject<number | null>
  subscribe: (cb: (x: number | null) => void) => () => void
  broadcast: (x: number | null) => void
  onClickRef: React.MutableRefObject<(genomicPosition: number) => void>
}

const CursorSyncContext = createContext<CursorSyncContextValue | null>(null)

type CursorSyncProviderProps = {
  onClick: (genomicPosition: number) => void
  children: React.ReactNode
}

export const CursorSyncProvider = ({ onClick, children }: CursorSyncProviderProps) => {
  const positionRef = useRef<number | null>(null)
  const listenersRef = useRef<Set<(x: number | null) => void>>(new Set())
  const onClickRef = useRef(onClick)
  onClickRef.current = onClick

  const subscribe = useCallback((cb: (x: number | null) => void) => {
    listenersRef.current.add(cb)
    return () => {
      listenersRef.current.delete(cb)
    }
  }, [])

  const broadcast = useCallback((x: number | null) => {
    positionRef.current = x
    listenersRef.current.forEach((cb) => cb(x))
  }, [])

  // Keep the context value referentially stable so consumers never re-render
  // due to the provider.
  const value = useRef<CursorSyncContextValue>({
    positionRef,
    subscribe,
    broadcast,
    onClickRef,
  }).current

  return <CursorSyncContext.Provider value={value}>{children}</CursorSyncContext.Provider>
}

const CursorWrapper = styled.div`
  position: relative;

  /* Establish a block formatting context so that child margins (e.g. <h2>)
     cannot collapse *through* this wrapper.  Without this, margin collapsing
     creates a visible gap between adjacent SynchronizedCursor instances. */
  display: flow-root;
`

const CursorOverlay = styled.svg`
  position: absolute;
  top: 0;
  height: 100%;
  pointer-events: none;
`

// Drop-in replacement for region-viewer's <Cursor>. Instances sharing a
// CursorSyncProvider track one hover position; updates go through direct DOM
// setAttribute calls so mouse-move never triggers a React re-render.

type SynchronizedCursorProps = {
  /** When true, reserve 24px padding above the tracks and render a coordinate label on the cursor line. */
  showLabel?: boolean
  /** When false, this cursor neither draws its line/label nor broadcasts hover/click to siblings. */
  enabled?: boolean
  children: React.ReactNode
}

export const SynchronizedCursor = ({
  showLabel,
  enabled = true,
  children,
}: SynchronizedCursorProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<SVGLineElement>(null)
  const textRef = useRef<SVGTextElement>(null)
  const sync = useContext(CursorSyncContext)
  if (!sync) {
    throw new Error('SynchronizedCursor must be rendered inside a CursorSyncProvider')
  }
  const { centerPanelWidth, leftPanelWidth, scalePosition } = useContext(RegionViewerContext)

  useEffect(() => {
    // When disabled, keep the line/label hidden and don't subscribe, so a
    // sibling's broadcast can't draw this instance.
    if (!enabled) {
      if (lineRef.current) lineRef.current.style.display = 'none'
      if (textRef.current) textRef.current.style.display = 'none'
      return undefined
    }
    return sync.subscribe((x) => {
      if (!lineRef.current) return
      if (x !== null) {
        lineRef.current.setAttribute('x1', String(x))
        lineRef.current.setAttribute('x2', String(x))
        lineRef.current.style.display = ''

        if (showLabel && textRef.current) {
          const genomicPos = Math.round(scalePosition.invert(x))
          textRef.current.textContent = genomicPos.toLocaleString()
          textRef.current.setAttribute('x', String(x))
          textRef.current.style.display = ''

          // Clamp text anchor so label doesn't clip at edges.
          const edgeMargin = 40
          if (x < edgeMargin) {
            textRef.current.setAttribute('text-anchor', 'start')
          } else if (x > centerPanelWidth - edgeMargin) {
            textRef.current.setAttribute('text-anchor', 'end')
          } else {
            textRef.current.setAttribute('text-anchor', 'middle')
          }
        }
      } else {
        lineRef.current.style.display = 'none'
        if (showLabel && textRef.current) {
          textRef.current.style.display = 'none'
        }
      }
    })
  }, [sync, showLabel, scalePosition, centerPanelWidth, enabled])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled) return
      const containerX = containerRef.current?.getBoundingClientRect().left ?? 0
      const x = e.clientX - containerX
      const inCenter = x >= leftPanelWidth && x <= leftPanelWidth + centerPanelWidth
      sync.broadcast(inCenter ? x - leftPanelWidth : null)
    },
    [leftPanelWidth, centerPanelWidth, sync, enabled]
  )

  const handleMouseLeave = useCallback(() => {
    if (!enabled) return
    sync.broadcast(null)
  }, [sync, enabled])

  const handleClick = useCallback(() => {
    if (!enabled) return
    const pos = sync.positionRef.current
    if (pos !== null) {
      sync.onClickRef.current(scalePosition.invert(pos))
    }
  }, [sync, scalePosition, enabled])

  return (
    <CursorWrapper
      ref={containerRef}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={showLabel && enabled ? { paddingTop: '24px' } : undefined}
    >
      <CursorOverlay
        style={{
          left: `${leftPanelWidth}px`,
          width: `${centerPanelWidth}px`,
        }}
      >
        {/* When a label is shown, start the line below the label band (y1=18)
            so it does not run through the coordinate digits. */}
        <line
          ref={lineRef}
          data-testid="region-viewer-cursor-line"
          x1={0}
          y1={showLabel ? 18 : 0}
          x2={0}
          y2="100%"
          stroke="#999"
          strokeWidth={1}
          style={{ display: 'none' }}
        />
        {showLabel && (
          <text
            ref={textRef}
            x={0}
            y={14}
            textAnchor="middle"
            style={{ display: 'none', fontSize: '10px', fill: '#000' }}
          />
        )}
      </CursorOverlay>
      {children}
    </CursorWrapper>
  )
}
