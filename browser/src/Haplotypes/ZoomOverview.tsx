import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import styled from 'styled-components'

const OverviewContainer = styled.div`
  position: relative;
  padding: 0.5rem 1rem;
  margin-bottom: 0.5rem;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
`

const OverviewHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.25rem;
  font-size: 13px;
`

const ZoomInfo = styled.span`
  color: #333;
  flex: 1;
`

const ResetButton = styled.button`
  padding: 0.25rem 0.5rem;
  border: 1px solid #1976d2;
  border-radius: 4px;
  background: #1976d2;
  color: white;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: #1565c0;
    border-color: #1565c0;
  }
`

const TrackWrapper = styled.div`
  position: relative;
  height: 40px;
  user-select: none;
`

const SelectionOverlay = styled.div<{ $isDragging: boolean }>`
  position: absolute;
  top: 0;
  height: 100%;
  background: rgba(66, 133, 244, 0.15);
  border: 2px solid rgba(66, 133, 244, 0.8);
  border-radius: 2px;
  cursor: ${props => (props.$isDragging ? 'grabbing' : 'grab')};
  box-sizing: border-box;
`

const ResizeHandle = styled.div<{ $position: 'left' | 'right' }>`
  position: absolute;
  top: 0;
  ${props => props.$position}: -6px;
  width: 12px;
  height: 100%;
  cursor: ew-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;

  &::after {
    content: '';
    width: 4px;
    height: 20px;
    background: rgba(66, 133, 244, 0.8);
    border-radius: 2px;
  }

  &:hover::after {
    background: rgba(66, 133, 244, 1);
  }
`

type Exon = {
  feature_type: 'CDS' | 'exon' | 'UTR'
  start: number
  stop: number
}

type Gene = {
  gene_id: string
  symbol: string
  start: number
  stop: number
  exons?: Exon[]
}

type ScaleFn = {
  (position: number): number
  invert: (x: number) => number
}

function linearScale(
  domainStart: number,
  domainStop: number,
  rangeStart: number,
  rangeStop: number
): ScaleFn {
  const domainSize = domainStop - domainStart
  const rangeSize = rangeStop - rangeStart

  const scale = ((position: number): number => {
    return rangeStart + ((position - domainStart) / domainSize) * rangeSize
  }) as ScaleFn

  scale.invert = (x: number): number => {
    const clamped = Math.max(rangeStart, Math.min(rangeStop, x))
    return domainStart + ((clamped - rangeStart) / rangeSize) * domainSize
  }

  return scale
}

interface ZoomOverviewProps {
  overviewRegion: { start: number; stop: number }
  currentRegion: { start: number; stop: number }
  chrom: string
  genes?: Gene[]
  onChangeRegion: (region: { start: number; stop: number }) => void
  onSetRegion?: (region: { start: number; stop: number }) => void
}

export default function ZoomOverview({
  overviewRegion,
  currentRegion,
  chrom,
  genes = [],
  onChangeRegion,
  onSetRegion,
}: ZoomOverviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize-left' | 'resize-right'
    startX: number
    startPixel: number
    stopPixel: number
    startGenomic: number
    stopGenomic: number
  } | null>(null)
  const [tempRegion, setTempRegion] = useState<{
    start: number
    stop: number
  } | null>(null)

  const dragMovedRef = useRef(false)
  const clickBlockerRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current) return
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  const scale = useMemo(
    () => linearScale(overviewRegion.start, overviewRegion.stop, 0, containerWidth),
    [overviewRegion.start, overviewRegion.stop, containerWidth]
  )

  const activeRegion = tempRegion || currentRegion
  const selectionLeft = scale(activeRegion.start)
  const selectionWidth = Math.max(scale(activeRegion.stop) - selectionLeft, 10)

  const isFullView =
    currentRegion.start <= overviewRegion.start && currentRegion.stop >= overviewRegion.stop

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: 'move' | 'resize-left' | 'resize-right') => {
      e.preventDefault()
      e.stopPropagation()
      dragMovedRef.current = false

      setDragState({
        type,
        startX: e.clientX,
        startPixel: scale(currentRegion.start),
        stopPixel: scale(currentRegion.stop),
        startGenomic: currentRegion.start,
        stopGenomic: currentRegion.stop,
      })
    },
    [currentRegion, scale]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState) return
      const deltaX = e.clientX - dragState.startX

      if (!dragMovedRef.current && Math.abs(deltaX) > 3) {
        dragMovedRef.current = true
      }

      let newStart = dragState.startGenomic
      let newStop = dragState.stopGenomic

      if (dragState.type === 'move') {
        newStart = scale.invert(dragState.startPixel + deltaX)
        newStop = scale.invert(dragState.stopPixel + deltaX)

        // Clamp
        if (newStart < overviewRegion.start) {
          const offset = overviewRegion.start - newStart
          newStart = overviewRegion.start
          newStop = newStop + offset
        }
        if (newStop > overviewRegion.stop) {
          const offset = newStop - overviewRegion.stop
          newStop = overviewRegion.stop
          newStart = newStart - offset
        }
      } else if (dragState.type === 'resize-left') {
        newStart = scale.invert(dragState.startPixel + deltaX)
        newStart = Math.max(overviewRegion.start, Math.min(newStart, newStop - 100))
      } else if (dragState.type === 'resize-right') {
        newStop = scale.invert(dragState.stopPixel + deltaX)
        newStop = Math.min(overviewRegion.stop, Math.max(newStop, newStart + 100))
      }

      setTempRegion({
        start: Math.round(newStart),
        stop: Math.round(newStop),
      })
    },
    [dragState, scale, overviewRegion.start, overviewRegion.stop]
  )

  const handleMouseUp = useCallback(() => {
    if (dragState && tempRegion) {
      clickBlockerRef.current = dragMovedRef.current
      onChangeRegion(tempRegion)
    }
    setDragState(null)
    setTempRegion(null)

    setTimeout(() => {
      clickBlockerRef.current = false
    }, 0)
  }, [dragState, tempRegion, onChangeRegion])

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragState, handleMouseMove, handleMouseUp])

  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (dragState || clickBlockerRef.current) return

      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickGenomic = scale.invert(clickX)

      const regionSize = currentRegion.stop - currentRegion.start
      let newStart = clickGenomic - regionSize / 2
      let newStop = clickGenomic + regionSize / 2

      if (newStart < overviewRegion.start) {
        newStart = overviewRegion.start
        newStop = overviewRegion.start + regionSize
      }
      if (newStop > overviewRegion.stop) {
        newStop = overviewRegion.stop
        newStart = overviewRegion.stop - regionSize
      }

      onChangeRegion({
        start: Math.round(newStart),
        stop: Math.round(newStop),
      })
    },
    [dragState, scale, currentRegion, overviewRegion, onChangeRegion]
  )

  const regionSize = currentRegion.stop - currentRegion.start
  const regionSizeStr =
    regionSize >= 1000000
      ? `${(regionSize / 1000000).toFixed(2)}Mb`
      : regionSize >= 1000
        ? `${(regionSize / 1000).toFixed(1)}kb`
        : `${regionSize}bp`

  return (
    <OverviewContainer>
      <OverviewHeader>
        <ZoomInfo>
          Viewing:{' '}
          <strong>
            {chrom}:{currentRegion.start.toLocaleString()}-{currentRegion.stop.toLocaleString()}
          </strong>{' '}
          ({regionSizeStr})
        </ZoomInfo>
        {!isFullView && onSetRegion && (
          <ResetButton
            onClick={() => onSetRegion(currentRegion)}
            style={{ background: '#43a047', borderColor: '#43a047' }}
          >
            Set as region
          </ResetButton>
        )}
        {!isFullView && (
          <ResetButton
            onClick={() =>
              onChangeRegion({ start: overviewRegion.start, stop: overviewRegion.stop })
            }
          >
            Reset zoom
          </ResetButton>
        )}
      </OverviewHeader>

      <TrackWrapper ref={containerRef} onClick={handleTrackClick}>
        <svg
          width={containerWidth}
          height={40}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {/* Background */}
          <rect x={0} y={0} width={containerWidth} height={40} fill="#f0f0f0" rx={2} />

          {/* Gene models with exons */}
          {genes.map(gene => {
            const gx = Math.max(0, scale(gene.start))
            const gx2 = Math.min(containerWidth, scale(gene.stop))
            const gw = Math.max(2, gx2 - gx)
            const midY = 20
            return (
              <g key={gene.gene_id}>
                {/* Gene spine (thin line spanning full gene) */}
                <line x1={gx} y1={midY} x2={gx + gw} y2={midY} stroke="#8e8e93" strokeWidth={1} />
                {/* Individual exons */}
                {gene.exons?.map((exon, i) => {
                  const ex = Math.max(0, scale(exon.start))
                  const ex2 = Math.min(containerWidth, scale(exon.stop))
                  const ew = Math.max(1, ex2 - ex)
                  const isCDS = exon.feature_type === 'CDS'
                  return (
                    <rect
                      key={i}
                      x={ex}
                      y={isCDS ? midY - 5 : midY - 3}
                      width={ew}
                      height={isCDS ? 10 : 6}
                      fill={isCDS ? '#616161' : '#9e9e9e'}
                      rx={0.5}
                    />
                  )
                })}
                {/* Gene label if wide enough */}
                {gw > 30 && (
                  <text
                    x={gx + gw / 2}
                    y={34}
                    fontSize="8"
                    fill="#666"
                    textAnchor="middle"
                  >
                    {gene.symbol}
                  </text>
                )}
              </g>
            )
          })}

          {/* Tick marks for genomic scale */}
          {useMemo(() => {
            const ticks: number[] = []
            const step = containerWidth > 400 ? 100000 : 200000
            const firstTick = Math.ceil(overviewRegion.start / step) * step
            for (let pos = firstTick; pos < overviewRegion.stop; pos += step) {
              ticks.push(pos)
            }
            return ticks.map(pos => {
              const x = scale(pos)
              return (
                <g key={pos}>
                  <line x1={x} y1={0} x2={x} y2={5} stroke="#bbb" strokeWidth={0.5} />
                  <text x={x} y={10} fontSize="7" fill="#999" textAnchor="middle">
                    {(pos / 1000000).toFixed(1)}M
                  </text>
                </g>
              )
            })
          }, [overviewRegion.start, overviewRegion.stop, scale, containerWidth])}
        </svg>

        {/* Selection overlay */}
        <SelectionOverlay
          $isDragging={dragState?.type === 'move'}
          style={{
            left: `${selectionLeft}px`,
            width: `${Math.max(selectionWidth, 10)}px`,
          }}
          onMouseDown={e => handleMouseDown(e, 'move')}
        >
          <ResizeHandle
            $position="left"
            onMouseDown={e => handleMouseDown(e, 'resize-left')}
          />
          <ResizeHandle
            $position="right"
            onMouseDown={e => handleMouseDown(e, 'resize-right')}
          />
        </SelectionOverlay>
      </TrackWrapper>
    </OverviewContainer>
  )
}
