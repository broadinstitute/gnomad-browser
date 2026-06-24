import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react'
import styled from 'styled-components'
import { RegionViewerContext } from '@gnomad/region-viewer'

// ---------------------------------------------------------------------------
// Context – one per group of synchronised cursors.  Holds a mutable ref for
// the current pixel-X (inside the centre panel) and a pub/sub mechanism so
// every <SynchronizedCursor> can update its SVG line imperatively (no React
// re-renders on mouse-move).
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Styled helpers – mirror the structure of @gnomad/region-viewer's Cursor.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// <SynchronizedCursor> – drop-in replacement for <Cursor>.
//
// Multiple instances inside the same <CursorSyncProvider> share a single
// hover position: moving the mouse in *any* of them draws the vertical line
// in *all* of them at the same pixel-X.
//
// Updates are handled via direct DOM manipulation (setAttribute on the SVG
// <line>) so there are zero React re-renders during mouse movement.
// ---------------------------------------------------------------------------

type SynchronizedCursorProps = {
  /** When true, reserve 24px padding above the tracks and render a coordinate label on the cursor line. */
  showLabel?: boolean
  children: React.ReactNode
}

export const SynchronizedCursor = ({ showLabel, children }: SynchronizedCursorProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<SVGLineElement>(null)
  const textRef = useRef<SVGTextElement>(null)
  const textBgRef = useRef<SVGRectElement>(null)
  const sync = useContext(CursorSyncContext)
  if (!sync) {
    throw new Error('SynchronizedCursor must be rendered inside a CursorSyncProvider')
  }
  const { centerPanelWidth, leftPanelWidth, scalePosition } = useContext(RegionViewerContext)

  // Subscribe to position broadcasts from any sibling cursor.
  useEffect(() => {
    return sync.subscribe((x) => {
      if (!lineRef.current) return
      if (x !== null) {
        lineRef.current.setAttribute('x1', String(x))
        lineRef.current.setAttribute('x2', String(x))
        lineRef.current.style.display = ''

        // Update the coordinate label if this instance shows it.
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

          // Size the background rect to match the text bounding box.
          if (textBgRef.current) {
            const bbox = textRef.current.getBBox()
            const pad = 2
            textBgRef.current.setAttribute('x', String(bbox.x - pad))
            textBgRef.current.setAttribute('y', String(bbox.y - pad))
            textBgRef.current.setAttribute('width', String(bbox.width + pad * 2))
            textBgRef.current.setAttribute('height', String(bbox.height + pad * 2))
            textBgRef.current.style.display = ''
          }
        }
      } else {
        lineRef.current.style.display = 'none'
        if (showLabel && textRef.current) {
          textRef.current.style.display = 'none'
          if (textBgRef.current) {
            textBgRef.current.style.display = 'none'
          }
        }
      }
    })
  }, [sync, showLabel, scalePosition, centerPanelWidth])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const containerX = containerRef.current?.getBoundingClientRect().left ?? 0
      const x = e.clientX - containerX
      const inCenter = x >= leftPanelWidth && x <= leftPanelWidth + centerPanelWidth
      sync.broadcast(inCenter ? x - leftPanelWidth : null)
    },
    [leftPanelWidth, centerPanelWidth, sync]
  )

  const handleMouseLeave = useCallback(() => {
    sync.broadcast(null)
  }, [sync])

  const handleClick = useCallback(() => {
    const pos = sync.positionRef.current
    if (pos !== null) {
      sync.onClickRef.current(scalePosition.invert(pos))
    }
  }, [sync, scalePosition])

  return (
    <CursorWrapper
      ref={containerRef}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={showLabel ? { paddingTop: '24px' } : undefined}
    >
      <CursorOverlay
        style={{
          left: `${leftPanelWidth}px`,
          width: `${centerPanelWidth}px`,
        }}
      >
        {/* Paint the line first so the label's white background (drawn after)
            masks it where the coordinate text sits — otherwise the line slices
            through the digits. */}
        <line
          ref={lineRef}
          data-testid="region-viewer-cursor-line"
          x1={0}
          y1={showLabel ? 18 : 0}
          x2={0}
          y2="100%"
          stroke="#000"
          strokeWidth={1}
          style={{ display: 'none' }}
        />
        {showLabel && (
          <>
            <rect ref={textBgRef} rx={2} ry={2} style={{ display: 'none', fill: '#fff' }} />
            <text
              ref={textRef}
              x={0}
              y={14}
              textAnchor="middle"
              style={{ display: 'none', fontSize: '10px', fill: '#000' }}
            />
          </>
        )}
      </CursorOverlay>
      {children}
    </CursorWrapper>
  )
}
