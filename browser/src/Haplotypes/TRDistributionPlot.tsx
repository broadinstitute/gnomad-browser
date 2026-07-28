import React, { useMemo, useState } from 'react'

import { SUPERPOPULATION_COLORS } from './colors'

export type TrDataPoint = { length_diff: number; pop: string; count: number }

export const POP_ORDER = ['AFR', 'AMR', 'ASJ', 'EAS', 'EUR', 'SAS', 'N/A']

const PLOT_MARGIN = { top: 8, right: 8, bottom: 20, left: 32 }

type Props = {
  distribution: TrDataPoint[]
  compact?: boolean
  interactive?: boolean
  yAxisLabel?: string
  xAxisLabel?: string
  ariaLabel?: string
  signedLabels?: boolean
}

/** Shared stacked allele-length distribution used by the track tooltip and table detail. */
const TRDistributionPlot = ({
  distribution,
  compact = false,
  interactive = true,
  yAxisLabel = 'Carriers',
  xAxisLabel = 'Length diff (bp)',
  ariaLabel = 'TR allele length distribution',
  signedLabels = true,
}: Props) => {
  const [hoveredBar, setHoveredBar] = useState<{
    lengthDiff: number
    x: number
    y: number
  } | null>(null)

  const byLength = useMemo(() => {
    const map = distribution.reduce((result, datum) => {
      const entry = result.get(datum.length_diff) || {}
      entry[datum.pop] = (entry[datum.pop] || 0) + datum.count
      result.set(datum.length_diff, entry)
      return result
    }, new Map<number, Record<string, number>>())
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([lengthDiff, pops]) => ({
        lengthDiff,
        pops,
        total: Object.values(pops).reduce((sum, count) => sum + count, 0),
      }))
  }, [distribution])

  if (byLength.length === 0) return null

  const height = compact ? 58 : 80
  const minimumWidth = compact ? 220 : 300
  const minimumBarStep = compact ? 8 : 12
  const plotWidth = Math.max(
    minimumWidth,
    byLength.length * minimumBarStep + PLOT_MARGIN.left + PLOT_MARGIN.right
  )
  const innerWidth = plotWidth - PLOT_MARGIN.left - PLOT_MARGIN.right
  const innerHeight = height - PLOT_MARGIN.top - PLOT_MARGIN.bottom
  const maxTotal = Math.max(...byLength.map((d) => d.total), 1)
  const barWidth = Math.max(3, Math.min(20, innerWidth / byLength.length - 2))
  const labelStep = Math.max(1, Math.ceil(byLength.length / (innerWidth / 20)))
  const xScale = (i: number) =>
    PLOT_MARGIN.left +
    (innerWidth / byLength.length) * i +
    (innerWidth / byLength.length - barWidth) / 2

  return (
    <div style={{ display: 'inline-block', overflowX: 'auto', maxWidth: '100%' }}>
      <svg width={plotWidth} height={height} aria-label={ariaLabel}>
        <line
          x1={PLOT_MARGIN.left}
          y1={PLOT_MARGIN.top}
          x2={PLOT_MARGIN.left}
          y2={PLOT_MARGIN.top + innerHeight}
          stroke="#ccc"
        />
        <text
          x={PLOT_MARGIN.left - 4}
          y={PLOT_MARGIN.top + 3}
          fontSize={8}
          textAnchor="end"
          fill="#999"
        >
          {maxTotal}
        </text>
        <text
          x={PLOT_MARGIN.left - 4}
          y={PLOT_MARGIN.top + innerHeight + 3}
          fontSize={8}
          textAnchor="end"
          fill="#999"
        >
          0
        </text>
        <line
          x1={PLOT_MARGIN.left}
          y1={PLOT_MARGIN.top + innerHeight}
          x2={plotWidth - PLOT_MARGIN.right}
          y2={PLOT_MARGIN.top + innerHeight}
          stroke="#ccc"
        />
        {byLength.map((d, i) => {
          const x = xScale(i)
          let y = PLOT_MARGIN.top + innerHeight
          const populations = [
            ...POP_ORDER,
            ...Object.keys(d.pops).filter((pop) => !POP_ORDER.includes(pop)),
          ]
          return (
            <g
              key={d.lengthDiff}
              onMouseEnter={
                interactive
                  ? (event) =>
                      setHoveredBar({
                        lengthDiff: d.lengthDiff,
                        x: event.clientX,
                        y: event.clientY,
                      })
                  : undefined
              }
              onMouseLeave={interactive ? () => setHoveredBar(null) : undefined}
            >
              {populations.map((pop) => {
                const count = d.pops[pop] || 0
                if (count === 0) return null
                const barHeight = (count / maxTotal) * innerHeight
                y -= barHeight
                return (
                  <rect
                    key={pop}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={SUPERPOPULATION_COLORS[pop] || '#999'}
                  />
                )
              })}
              {i % labelStep === 0 && (
                <text
                  x={x + barWidth / 2}
                  y={PLOT_MARGIN.top + innerHeight + 12}
                  fontSize={7}
                  textAnchor="middle"
                  fill="#666"
                >
                  {signedLabels && d.lengthDiff > 0 ? `+${d.lengthDiff}` : d.lengthDiff}
                </text>
              )}
            </g>
          )
        })}
        {!compact && (
          <>
            <text
              x={PLOT_MARGIN.left + innerWidth / 2}
              y={height - 1}
              fontSize={8}
              textAnchor="middle"
              fill="#999"
            >
              {xAxisLabel}
            </text>
            <text
              x={4}
              y={PLOT_MARGIN.top + innerHeight / 2}
              fontSize={8}
              textAnchor="middle"
              fill="#999"
              transform={`rotate(-90, 4, ${PLOT_MARGIN.top + innerHeight / 2})`}
            >
              {yAxisLabel}
            </text>
          </>
        )}
      </svg>
      {interactive &&
        hoveredBar &&
        (() => {
          const datum = byLength.find((d) => d.lengthDiff === hoveredBar.lengthDiff)
          if (!datum) return null
          return (
            <div
              style={{
                position: 'fixed',
                left: hoveredBar.x + 12,
                top: hoveredBar.y - 10,
                background: 'white',
                border: '1px solid #ccc',
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: 11,
                zIndex: 1000,
                pointerEvents: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 2 }}>
                {xAxisLabel}:{' '}
                {signedLabels && datum.lengthDiff > 0 ? `+${datum.lengthDiff}` : datum.lengthDiff}bp
              </div>
              {Object.entries(datum.pops)
                .filter(([, count]) => count > 0)
                .map(([pop, count]) => (
                  <div key={pop}>
                    {pop}: {count}
                  </div>
                ))}
              <div style={{ marginTop: 2, color: '#666' }}>Total: {datum.total}</div>
            </div>
          )
        })()}
    </div>
  )
}

export default TRDistributionPlot
