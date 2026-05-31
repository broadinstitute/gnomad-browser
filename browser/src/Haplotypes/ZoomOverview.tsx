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
  gap: 0.75rem;
  margin-bottom: 0.25rem;
  font-size: 13px;
`

const ZoomInfo = styled.span`
  color: #333;
  flex: 1;
`

const SetRegionButton = styled.button`
  padding: 0.25rem 0.75rem;
  border: none;
  border-radius: 4px;
  background: #43a047;
  color: white;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);

  &:hover {
    background: #388e3c;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  }
`

const ResetButton = styled.button`
  padding: 0.25rem 0.5rem;
  border: 1px solid #9e9e9e;
  border-radius: 4px;
  background: transparent;
  color: #616161;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: #eeeeee;
    border-color: #757575;
    color: #424242;
  }
`

const ZoomButtonGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 11px;
  color: #616161;
`

const ZoomButton = styled.button`
  padding: 0.15rem 0.4rem;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  background: white;
  color: #424242;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1;

  &:hover {
    background: #e3f2fd;
    border-color: #90caf9;
    color: #1565c0;
  }
`

const TrackWrapper = styled.div`
  position: relative;
  user-select: none;
  overflow: hidden;
`

const SelectionOverlay = styled.div<{ $isDragging: boolean }>`
  position: absolute;
  top: 0;
  height: 100%;
  background: rgba(66, 133, 244, 0.08);
  border-left: 2px solid rgba(66, 133, 244, 0.8);
  border-right: 2px solid rgba(66, 133, 244, 0.8);
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
  feature_type: string
  start: number
  stop: number
}

type Gene = {
  gene_id?: string
  symbol?: string
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

// Compute variant density as binned counts for the minimap
function computeVariantDensity(
  variants: any[],
  regionStart: number,
  regionStop: number,
  numBins: number
): number[] {
  const bins = new Array(numBins).fill(0)
  const binSize = (regionStop - regionStart) / numBins
  for (const v of variants) {
    const pos = v.pos ?? v.position
    if (pos == null || pos < regionStart || pos > regionStop) continue
    const bin = Math.min(Math.floor((pos - regionStart) / binSize), numBins - 1)
    bins[bin]++
  }
  return bins
}

const MINIMAP_HEIGHT = 65
const DENSITY_HEIGHT = 18
const GENE_AREA_TOP = DENSITY_HEIGHT + 4
const GENE_AREA_HEIGHT = MINIMAP_HEIGHT - GENE_AREA_TOP - 6

interface ZoomOverviewProps {
  overviewRegion: { start: number; stop: number }
  currentRegion: { start: number; stop: number }
  chrom: string
  genes?: Gene[]
  variants?: any[]
  onChangeRegion: (region: { start: number; stop: number } | null) => void
  onSetRegion?: (region: { start: number; stop: number }) => void
  onNavigateRegion?: (region: { chrom: string; start: number; stop: number }) => void
}

export default function ZoomOverview({
  overviewRegion,
  currentRegion,
  chrom,
  genes = [],
  variants = [],
  onChangeRegion,
  onSetRegion,
  onNavigateRegion,
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

  const handleZoom = useCallback(
    (factor: number) => {
      const center = (currentRegion.start + currentRegion.stop) / 2
      const newSize = (currentRegion.stop - currentRegion.start) / factor
      let newStart = Math.round(center - newSize / 2)
      let newStop = Math.round(center + newSize / 2)

      if (newStart >= overviewRegion.start && newStop <= overviewRegion.stop) {
        onChangeRegion({ start: newStart, stop: newStop })
      } else if (onNavigateRegion) {
        newStart = Math.max(1, newStart)
        onNavigateRegion({ chrom, start: newStart, stop: newStop })
      } else {
        newStart = Math.max(overviewRegion.start, newStart)
        newStop = Math.min(overviewRegion.stop, newStop)
        onChangeRegion({ start: newStart, stop: newStop })
      }
    },
    [currentRegion, overviewRegion, chrom, onChangeRegion, onNavigateRegion]
  )

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
  const selectionRight = scale(activeRegion.stop)
  const selectionWidth = Math.max(selectionRight - selectionLeft, 10)

  const isFullView =
    currentRegion.start <= overviewRegion.start && currentRegion.stop >= overviewRegion.stop

  // Variant density bins for the minimap
  const numBins = Math.max(Math.floor(containerWidth / 4), 50)
  const densityBins = useMemo(
    () => computeVariantDensity(variants, overviewRegion.start, overviewRegion.stop, numBins),
    [variants, overviewRegion.start, overviewRegion.stop, numBins]
  )
  const maxDensity = Math.max(1, ...densityBins)

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

  const geneMidY = GENE_AREA_TOP + GENE_AREA_HEIGHT / 2
  const binWidth = containerWidth / numBins

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
          <SetRegionButton onClick={() => onSetRegion(currentRegion)}>
            Set as region
          </SetRegionButton>
        )}
        {!isFullView && (
          <ResetButton
            onClick={() => onChangeRegion(null)}
          >
            Reset zoom
          </ResetButton>
        )}
        <ZoomButtonGroup>
          <span>+</span>
          {[1.5, 3, 10].map((z) => (
            <ZoomButton key={z} onClick={() => handleZoom(z)}>{z}x</ZoomButton>
          ))}
          <span style={{ marginLeft: '0.25rem' }}>−</span>
          {[1.5, 3, 10].map((z) => (
            <ZoomButton key={z} onClick={() => handleZoom(1 / z)}>{z}x</ZoomButton>
          ))}
        </ZoomButtonGroup>
      </OverviewHeader>

      <TrackWrapper ref={containerRef} onClick={handleTrackClick} style={{ height: MINIMAP_HEIGHT }}>
        <svg
          width={containerWidth}
          height={MINIMAP_HEIGHT}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {/* Background */}
          <rect x={0} y={0} width={containerWidth} height={MINIMAP_HEIGHT} fill="#f0f0f0" rx={2} />

          {/* Variant density bars */}
          {densityBins.map((count, i) => {
            if (count === 0) return null
            const barHeight = (count / maxDensity) * DENSITY_HEIGHT
            return (
              <rect
                key={`d${i}`}
                x={i * binWidth}
                y={DENSITY_HEIGHT - barHeight}
                width={Math.max(binWidth - 0.5, 1)}
                height={barHeight}
                fill="#7986cb"
                opacity={0.6}
              />
            )
          })}

          {/* Gene models with exons */}
          {genes.map((gene, gi) => {
            const gx = Math.max(0, scale(gene.start))
            const gx2 = Math.min(containerWidth, scale(gene.stop))
            const gw = Math.max(2, gx2 - gx)
            return (
              <g key={gene.gene_id || gi}>
                <line x1={gx} y1={geneMidY} x2={gx + gw} y2={geneMidY} stroke="#8e8e93" strokeWidth={1} />
                {gene.exons?.map((exon, i) => {
                  const ex = Math.max(0, scale(exon.start))
                  const ex2 = Math.min(containerWidth, scale(exon.stop))
                  const ew = Math.max(1, ex2 - ex)
                  const isCDS = exon.feature_type === 'CDS'
                  return (
                    <rect
                      key={i}
                      x={ex}
                      y={isCDS ? geneMidY - 5 : geneMidY - 3}
                      width={ew}
                      height={isCDS ? 10 : 6}
                      fill={isCDS ? '#616161' : '#9e9e9e'}
                      rx={0.5}
                    />
                  )
                })}
                {gw > 30 && (
                  <text
                    x={gx + gw / 2}
                    y={MINIMAP_HEIGHT - 3}
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

          {/* Grey-out overlays on unselected flanks */}
          {!isFullView && (
            <>
              <rect x={0} y={0} width={Math.max(selectionLeft, 0)} height={MINIMAP_HEIGHT} fill="rgba(0,0,0,0.12)" />
              <rect x={selectionLeft + selectionWidth} y={0} width={Math.max(containerWidth - selectionLeft - selectionWidth, 0)} height={MINIMAP_HEIGHT} fill="rgba(0,0,0,0.12)" />
            </>
          )}

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
                  <line x1={x} y1={GENE_AREA_TOP} x2={x} y2={GENE_AREA_TOP + 4} stroke="#ccc" strokeWidth={0.5} />
                </g>
              )
            })
          }, [overviewRegion.start, overviewRegion.stop, scale, containerWidth])}
        </svg>

        {/* Selection overlay — always rendered so drag handles are accessible */}
        <SelectionOverlay
          $isDragging={dragState?.type === 'move'}
          style={{
            left: `${selectionLeft}px`,
            width: `${Math.max(selectionWidth, 10)}px`,
            ...(isFullView ? { background: 'transparent', borderColor: 'transparent' } : {}),
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

