import React from 'react'

import type {
  DeletionAlleleFrequencyPoint,
  SourceEventRecord,
} from './sourceEventAggregation'

const WIDTH = 320
const HEIGHT = 112
const MARGIN = { top: 8, right: 8, bottom: 24, left: 40 }

type PlottedPoint<T extends SourceEventRecord> = DeletionAlleleFrequencyPoint<T> & {
  length: number
  af: number
}

/** One point per deletion ALT. Equal lengths are jittered rather than summed. */
const DeletionAllelicSeriesPlot = <T extends SourceEventRecord>({
  points,
}: {
  points: DeletionAlleleFrequencyPoint<T>[]
}) => {
  const plotted = points.filter(
    (point): point is PlottedPoint<T> => point.length != null && point.af != null
  )
  if (plotted.length === 0) return null

  const innerWidth = WIDTH - MARGIN.left - MARGIN.right
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  const minLength = Math.min(...plotted.map((point) => point.length))
  const maxLength = Math.max(...plotted.map((point) => point.length))
  const maxAf = Math.max(...plotted.map((point) => point.af), 0.000001)
  const x = (length: number) => {
    if (minLength === maxLength) return MARGIN.left + innerWidth / 2
    return MARGIN.left + ((length - minLength) / (maxLength - minLength)) * innerWidth
  }
  const y = (af: number) => MARGIN.top + innerHeight - (af / maxAf) * innerHeight
  const totals = plotted.reduce(
    (result, point) => result.set(point.length, (result.get(point.length) || 0) + 1),
    new Map<number, number>()
  )
  const occurrences = new Map<number, number>()

  return (
    <svg width={WIDTH} height={HEIGHT} aria-label="Deletion allelic-series plot">
      <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={MARGIN.top + innerHeight} stroke="#ccc" />
      <line x1={MARGIN.left} y1={MARGIN.top + innerHeight} x2={WIDTH - MARGIN.right} y2={MARGIN.top + innerHeight} stroke="#ccc" />
      <text x={MARGIN.left - 4} y={MARGIN.top + 3} fontSize={8} textAnchor="end" fill="#777">{maxAf.toPrecision(2)}</text>
      <text x={MARGIN.left - 4} y={MARGIN.top + innerHeight + 3} fontSize={8} textAnchor="end" fill="#777">0</text>
      <text x={MARGIN.left} y={HEIGHT - 2} fontSize={8} textAnchor="middle" fill="#777">{minLength}</text>
      <text x={WIDTH - MARGIN.right} y={HEIGHT - 2} fontSize={8} textAnchor="middle" fill="#777">{maxLength}</text>
      <text x={MARGIN.left + innerWidth / 2} y={HEIGHT - 2} fontSize={8} textAnchor="middle" fill="#777">Deletion length (bp)</text>
      <text x={5} y={MARGIN.top + innerHeight / 2} fontSize={8} textAnchor="middle" fill="#777" transform={`rotate(-90, 5, ${MARGIN.top + innerHeight / 2})`}>ALT AF</text>
      {plotted.map((point) => {
        const index = occurrences.get(point.length) || 0
        occurrences.set(point.length, index + 1)
        const count = totals.get(point.length) || 1
        const jitter = count === 1 ? 0 : (index - (count - 1) / 2) * 5
        return <circle key={point.allele.variant_id} cx={x(point.length) + jitter} cy={y(point.af)} r={3} fill="#D73027" fillOpacity={0.75} aria-label={`${point.length} bp, AF ${point.af}`} />
      })}
    </svg>
  )
}

export default DeletionAllelicSeriesPlot
