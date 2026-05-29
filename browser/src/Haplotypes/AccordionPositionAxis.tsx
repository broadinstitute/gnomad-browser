import React, { useContext } from 'react'
import { RegionViewerContext, Track } from '@gnomad/region-viewer'
import AccordionContext from './AccordionContext'

const PHANTOM_LABEL_COLOR = '#2196F3'

const AccordionPositionAxis = () => {
  const { scalePosition, centerPanelWidth: width } = useContext(RegionViewerContext)
  const { mapper } = useContext(AccordionContext)

  const height = 15
  const numIntervals = Math.min(10, Math.floor(width / 90))
  const tickInterval = width / numIntervals

  // Build phantom gap pixel ranges for suppressing reference ticks that land inside gaps
  const phantomPixelRanges: { start: number; end: number }[] = []
  const pxPerUnit = mapper ? width / mapper.totalVisualLength : 0

  if (mapper) {
    for (const locus of mapper.getPhantomLoci()) {
      if (locus.maxPhantomLength <= 0) continue
      const pxStart = scalePosition(locus.genomicPos)
      const pxEnd = pxStart + locus.maxPhantomLength * pxPerUnit
      phantomPixelRanges.push({ start: pxStart, end: pxEnd })
    }
  }

  const isInPhantomGap = (px: number): boolean =>
    phantomPixelRanges.some((r) => px >= r.start && px <= r.end)

  // Generate standard ticks, filtering out any that land inside phantom gaps
  const allTicks = [...Array(numIntervals - 1)].map((_, i) => tickInterval * (i + 1))
  const referenceTicks = allTicks.filter((x) => !isInPhantomGap(x))

  return (
    <svg height={height} width={width}>
      <line x1={0} y1={height} x2={width} y2={height} stroke="black" strokeWidth={2} />

      {/* Start tick */}
      <g>
        <line x1={0} y1={height} x2={0} y2={height - 5} stroke="black" strokeWidth={2} />
        <text x={0} y={height - 7} textAnchor="start" style={{ fontSize: '10px' }}>
          {scalePosition.invert(0).toLocaleString()}
        </text>
      </g>

      {/* Reference ticks */}
      {referenceTicks.map((x) => (
        <g key={x}>
          <line x1={x} y1={height} x2={x} y2={height - 5} stroke="black" strokeWidth={1} />
          <text x={x} y={height - 7} textAnchor="middle" style={{ fontSize: '10px' }}>
            {scalePosition.invert(x).toLocaleString()}
          </text>
        </g>
      ))}

      {/* End tick */}
      <g>
        <line x1={width} y1={height} x2={width} y2={height - 5} stroke="black" strokeWidth={2} />
        <text x={width} y={height - 7} textAnchor="end" style={{ fontSize: '10px' }}>
          {scalePosition.invert(width).toLocaleString()}
        </text>
      </g>

      {/* Phantom gap labels — only show when there's enough pixel space */}
      {mapper &&
        (() => {
          const MIN_LABEL_SPACING = 80 // minimum pixels between labels
          let lastLabelEnd = -Infinity
          return mapper.getPhantomLoci().map((locus) => {
            if (locus.maxPhantomLength <= 0) return null
            const pxStart = scalePosition(locus.genomicPos)
            const gapWidth = locus.maxPhantomLength * pxPerUnit
            // Skip labels for gaps narrower than ~30px
            if (gapWidth < 30) return null
            const pxCenter = pxStart + gapWidth / 2
            // Skip if too close to the last rendered label
            if (pxCenter - lastLabelEnd < MIN_LABEL_SPACING) return null
            const label = `+${locus.maxPhantomLength.toLocaleString()}bp${locus.isTruncated ? ' (~)' : ''}`
            lastLabelEnd = pxCenter + label.length * 3 // rough estimate of label half-width

            return (
              <text
                key={`phantom-${locus.genomicPos}`}
                x={pxCenter}
                y={height - 7}
                textAnchor="middle"
                fill={PHANTOM_LABEL_COLOR}
                fontStyle="italic"
                style={{ fontSize: '10px' }}
              >
                {label}
              </text>
            )
          })
        })()}
    </svg>
  )
}

export const AccordionPositionAxisTrack = () => (
  <Track>{() => <AccordionPositionAxis />}</Track>
)

export default AccordionPositionAxis
