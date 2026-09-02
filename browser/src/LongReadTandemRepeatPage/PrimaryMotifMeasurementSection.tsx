import React from 'react'
import styled from 'styled-components'

import { LONG_READ_PRIMARY_PLOT_COLOR } from '../LongReadPlotTheme'
import { Panel } from './LongReadTrVisualizations'
import { PrimaryMotifMeasurementData } from './types'

const Boundary = styled.p`
  max-width: 78em;
  padding: 0.75em 0.9em;
  border-left: 4px solid #6f3c8f;
  background: #f7f2fa;
  color: #3e2850;
`

const PlotScroller = styled.div`
  overflow-x: auto;
  outline-offset: 2px;

  &:focus-visible {
    outline: 3px solid #111;
  }
`

const MeasurementGrid = styled.div`
  /* stylelint-disable unit-whitelist -- fractional tracks preserve readable cards. */
  display: grid;
  grid-template-columns: minmax(420px, 1.35fr) minmax(320px, 1fr);
  gap: 1.5em;

  @media (max-width: 900px) {
    grid-template-columns: minmax(280px, 1fr);
  }
  /* stylelint-enable unit-whitelist */
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

const Summary = styled.dl`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em 1.5em;
  margin: 0.75em 0 1em;

  div {
    min-width: 10em;
  }

  dt {
    color: #596a75;
    font-size: 0.88em;
  }

  dd {
    margin-left: 0;
    font-weight: bold;
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

const PrimaryMotifAlleleHistogram = ({
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

const PrimaryMotifGenotypeCells = ({
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
        <h3>Anonymous diploid genotype cells</h3>
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
    <PlotCard data-testid="primary-motif-genotype-cells">
      <h3>Anonymous diploid genotype cells</h3>
      <p>
        HGSVC / HPRC only: {genotype.called_diploid_people!.toLocaleString()} people with
        source-complete diploid calls
        {genotype.no_call_people ? `; ${genotype.no_call_people.toLocaleString()} no-call` : ''}.
      </p>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block', width: '100%', maxWidth: size }}
        role="img"
        aria-label={`Anonymous genotype cells by shorter and longer exact ${motif} units`}
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
          const x = padding + linearPosition(cell.shorter_exact_units, minimum, maximum, inner)
          const y =
            size - padding - linearPosition(cell.longer_exact_units, minimum, maximum, inner)
          const side = 5 + Math.sqrt(cell.people / largest) * 19
          return (
            <rect
              key={`${cell.shorter_exact_units}/${cell.longer_exact_units}`}
              x={x - side / 2}
              y={y - side / 2}
              width={side}
              height={side}
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
          Shorter allele — exact {motif} units
        </text>
        <text
          x={12}
          y={size / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${size / 2})`}
          fill="#38434a"
          fontSize={10}
        >
          Longer allele — exact {motif} units
        </text>
      </svg>
    </PlotCard>
  )
}

const PrimaryMotifMeasurementSection = ({
  measurement,
}: {
  measurement: PrimaryMotifMeasurementData
}) => {
  if (
    measurement.status !== 'AVAILABLE' ||
    !measurement.motif ||
    measurement.scope !== 'WHOLE_REPRESENTED_ALLELE' ||
    measurement.unit !== 'EXACT_PRIMARY_MOTIF_UNITS'
  ) {
    return null
  }

  const motif = measurement.motif
  return (
    <Panel aria-labelledby="lr-tr-primary-motif-heading" data-testid="primary-motif-measurement">
      <h2 id="lr-tr-primary-motif-heading">
        Long-read exact {motif} units across the represented allele
      </h2>
      <Boundary data-testid="primary-motif-boundary">
        <strong>Whole-record, non-clinical measurement.</strong> Each value counts exact,
        non-overlapping {motif} units across the complete represented REF or ALT allele. It is an
        aggregate research measurement, not a component repeat count, total length change, source
        MC/LPS value, short-read estimate, diagnostic result, or clinical classification.
      </Boundary>
      <Summary>
        <div>
          <dt>Allele copies</dt>
          <dd>{measurement.called_alleles!.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Complete source ALT identities checked</dt>
          <dd>{measurement.alternate_identities_checked!.toLocaleString()}</dd>
        </div>
        {measurement.biological_role && (
          <div>
            <dt>Source-backed motif role</dt>
            <dd>{measurement.biological_role}</dd>
          </div>
        )}
      </Summary>
      <MeasurementGrid>
        <PlotCard>
          <h3>Allele-copy distribution</h3>
          <PrimaryMotifAlleleHistogram measurement={measurement} />
        </PlotCard>
        <PrimaryMotifGenotypeCells measurement={measurement} />
      </MeasurementGrid>
      {measurement.provenance && (
        <details>
          <summary>Exact primary-motif product provenance</summary>
          <dl>
            <dt>Product run</dt>
            <dd>
              <code>{measurement.provenance.product_run_id}</code>
            </dd>
            <dt>Source record</dt>
            <dd>
              <code>{measurement.provenance.source_variant_id}</code>
            </dd>
            <dt>Reviewed registry digest</dt>
            <dd>
              <code>{measurement.provenance.registry_digest}</code>
            </dd>
            <dt>Algorithm</dt>
            <dd>
              <code>{measurement.provenance.algorithm_version}</code>
            </dd>
            <dt>Anchor rule</dt>
            <dd>
              <code>{measurement.provenance.anchor_rule}</code>
            </dd>
            <dt>Bounds status</dt>
            <dd>{measurement.provenance.bounds_status}</dd>
          </dl>
        </details>
      )}
    </Panel>
  )
}

export default PrimaryMotifMeasurementSection
