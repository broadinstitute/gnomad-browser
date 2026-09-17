import React from 'react'
import styled from 'styled-components'

import { LONG_READ_PRIMARY_PLOT_COLOR } from '../LongReadPlotTheme'
import { PrimaryMotifMeasurementData } from './types'

const PlotScroller = styled.div`
  overflow-x: auto;
  outline-offset: 2px;

  &:focus-visible {
    outline: 3px solid #111;
  }
`

const PlotCard = styled.div`
  min-width: 0;
  padding: 1em;
  border: 1px solid #d8dee2;
  border-radius: 4px;
  background: #fbfcfd;

  h3 {
    margin-top: 0;
  }
`

const dimensions = {
  top: 18,
  right: 18,
  bottom: 62,
  left: 64,
  height: 280,
}

const linearPosition = (value: number, minimum: number, maximum: number, size: number) =>
  minimum === maximum ? size / 2 : ((value - minimum) / (maximum - minimum)) * size

export const PrimaryMotifAlleleHistogram = ({
  measurement,
}: {
  measurement: PrimaryMotifMeasurementData
}) => {
  const motif = measurement.motif!
  const bins = measurement.bins
  const plotWidth = Math.max(480, bins.length * 34)
  const innerWidth = plotWidth - dimensions.left - dimensions.right
  const innerHeight = dimensions.height - dimensions.top - dimensions.bottom
  const maximum = Math.max(1, ...bins.map((bin) => bin.allele_copies))
  const barSlot = innerWidth / Math.max(1, bins.length)
  const barWidth = Math.max(3, Math.min(28, barSlot - 3))
  const y = (value: number) => dimensions.top + innerHeight * (1 - value / maximum)

  return (
    <PlotScroller
      role="region"
      aria-label={`Scrollable exact ${motif} unit allele-copy distribution`}
      tabIndex={0}
    >
      <svg
        width={plotWidth}
        height={dimensions.height}
        role="img"
        aria-label={`Exact ${motif} units on the x axis and allele copies on the y axis`}
        data-exact-alt-interaction="none"
      >
        <line
          x1={dimensions.left}
          y1={dimensions.top + innerHeight}
          x2={dimensions.left + innerWidth}
          y2={dimensions.top + innerHeight}
          stroke="#566168"
        />
        <line
          x1={dimensions.left}
          y1={dimensions.top}
          x2={dimensions.left}
          y2={dimensions.top + innerHeight}
          stroke="#566168"
        />
        {[0, Math.round(maximum / 2), maximum].map((tick) => (
          <g key={tick}>
            <line
              x1={dimensions.left - 4}
              y1={y(tick)}
              x2={dimensions.left + innerWidth}
              y2={y(tick)}
              stroke={tick === 0 ? '#566168' : '#e2e6e8'}
            />
            <text
              x={dimensions.left - 8}
              y={y(tick) + 4}
              textAnchor="end"
              fill="#566168"
              fontSize={10}
            >
              {tick.toLocaleString()}
            </text>
          </g>
        ))}
        {bins.map((bin, index) => {
          const center = dimensions.left + (index + 0.5) * barSlot
          const height = Math.max(
            bin.allele_copies ? 2 : 0,
            (bin.allele_copies / maximum) * innerHeight
          )
          return (
            <g key={bin.exact_units}>
              <rect
                x={center - barWidth / 2}
                y={dimensions.top + innerHeight - height}
                width={barWidth}
                height={height}
                fill={LONG_READ_PRIMARY_PLOT_COLOR}
              >
                <title>
                  {bin.exact_units.toLocaleString()} exact {motif} units:{' '}
                  {bin.allele_copies.toLocaleString()} allele copies
                </title>
              </rect>
              {(bins.length <= 30 || index === 0 || index === bins.length - 1) && (
                <text
                  x={center}
                  y={dimensions.top + innerHeight + 17}
                  textAnchor="middle"
                  fill="#566168"
                  fontSize={9}
                >
                  {bin.exact_units}
                </text>
              )}
            </g>
          )
        })}
        <text
          x={dimensions.left + innerWidth / 2}
          y={dimensions.height - 10}
          textAnchor="middle"
          fill="#38434a"
          fontSize={11}
          fontWeight="bold"
        >
          Exact {motif} units across the represented allele
        </text>
        <text
          x={14}
          y={dimensions.top + innerHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90 14 ${dimensions.top + innerHeight / 2})`}
          fill="#38434a"
          fontSize={11}
          fontWeight="bold"
        >
          Allele copies
        </text>
      </svg>
    </PlotScroller>
  )
}

export const PrimaryMotifGenotypeCells = ({
  measurement,
}: {
  measurement: PrimaryMotifMeasurementData
}) => {
  const { genotype } = measurement
  const motif = measurement.motif!
  if (genotype.status !== 'AVAILABLE') {
    const reason =
      genotype.reason_code === 'AGGREGATE_ONLY_SOURCE_NO_GT_PAIRING'
        ? 'All of Us is aggregate-only and has no source-complete genotype pairing.'
        : 'Source-complete anonymous genotype pairing is unavailable for this product.'
    return (
      <PlotCard data-testid="primary-motif-genotype-unavailable">
        <h3>Genotype exact-motif distribution</h3>
        <p role="status">{reason}</p>
      </PlotCard>
    )
  }

  const cells = genotype.cells
  const shorter = cells.map((cell) => cell.shorter_exact_units)
  const longer = cells.map((cell) => cell.longer_exact_units)
  const minimum = Math.min(...shorter, ...longer)
  const maximum = Math.max(...shorter, ...longer)
  const largest = Math.max(...cells.map((cell) => cell.people))
  const size = 320
  const padding = 48
  const inner = size - padding * 2

  return (
    <PlotCard data-testid="primary-motif-genotype-cells" data-plot-card="genotype-exact-motif">
      <h3>Genotype exact-motif distribution</h3>
      <p>
        HGSVC / HPRC only: {genotype.called_diploid_people!.toLocaleString()} people with
        source-complete diploid calls
        {genotype.no_call_people ? `; ${genotype.no_call_people.toLocaleString()} no-call` : ''}.
      </p>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block', width: '100%', maxWidth: size }}
        role="img"
        aria-label={`Anonymous genotype cells by longer and shorter exact ${motif} units`}
        data-source-complete="true"
        data-exact-alt-interaction="none"
      >
        <line
          x1={padding}
          y1={size - padding}
          x2={size - padding}
          y2={size - padding}
          stroke="#566168"
        />
        <line x1={padding} y1={padding} x2={padding} y2={size - padding} stroke="#566168" />
        {cells.map((cell) => {
          const x = padding + linearPosition(cell.longer_exact_units, minimum, maximum, inner)
          const y =
            size - padding - linearPosition(cell.shorter_exact_units, minimum, maximum, inner)
          const side = 5 + Math.sqrt(cell.people / largest) * 19
          return (
            <rect
              key={`${cell.shorter_exact_units}/${cell.longer_exact_units}`}
              x={x - side / 2}
              y={y - side / 2}
              width={side}
              height={side}
              data-longer-exact-units={cell.longer_exact_units}
              data-shorter-exact-units={cell.shorter_exact_units}
              fill={LONG_READ_PRIMARY_PLOT_COLOR}
              opacity={0.82}
            >
              <title>
                {cell.shorter_exact_units}/{cell.longer_exact_units} exact {motif} units:{' '}
                {cell.people} people
              </title>
            </rect>
          )
        })}
        <text x={size / 2} y={size - 9} textAnchor="middle" fill="#38434a" fontSize={10}>
          Longer allele — exact {motif} units
        </text>
        <text
          x={12}
          y={size / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${size / 2})`}
          fill="#38434a"
          fontSize={10}
        >
          Shorter allele — exact {motif} units
        </text>
      </svg>
    </PlotCard>
  )
}

export const primaryMotifMeasurementAvailable = (measurement?: PrimaryMotifMeasurementData) =>
  measurement?.status === 'AVAILABLE' &&
  Boolean(measurement.motif) &&
  measurement.scope === 'WHOLE_REPRESENTED_ALLELE' &&
  measurement.unit === 'EXACT_PRIMARY_MOTIF_UNITS'

export const primaryMotifGenotypeAvailable = (measurement?: PrimaryMotifMeasurementData) =>
  primaryMotifMeasurementAvailable(measurement) && measurement?.genotype.status === 'AVAILABLE'

export const PrimaryMotifAllelePlotCard = ({
  measurement,
}: {
  measurement: PrimaryMotifMeasurementData
}) => (
  <PlotCard data-testid="primary-motif-allele-copies" data-plot-card="allele-exact-motif">
    <h3>Allele exact-motif distribution</h3>
    <PrimaryMotifAlleleHistogram measurement={measurement} />
  </PlotCard>
)
