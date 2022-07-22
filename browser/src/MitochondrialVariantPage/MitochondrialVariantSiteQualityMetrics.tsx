import { max } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import React, { useState } from 'react'
import { withSize } from 'react-sizeme'
import styled from 'styled-components'
import { AxisBottom, AxisLeft } from '@vx/axis'

import { BaseTable, Select, Tabs, TooltipAnchor } from '@gnomad/ui'

// @ts-expect-error TS(2732) FIXME: Cannot find module '@gnomad/dataset-metadata/datas... Remove this comment to see the full error message
import gnomadV3MitochondrialVariantSiteQualityMetricDistributions from '@gnomad/dataset-metadata/datasets/gnomad-v3-mitochondria/gnomadV3MitochondrialVariantSiteQualityMetricDistributions.json'

import MitochondrialVariantDetailPropType from './MitochondrialVariantDetailPropType'

const formatMetricValue = (value: any) => {
  if (Math.abs(value) < 0.001) {
    return value === 0 ? '0' : value.toExponential(3)
  }

  return value.toLocaleString()
}

// ================================================================================================
// Plot
// ================================================================================================

const yTickFormat = (n: any) => {
  if (n >= 1e9) {
    return `${(n / 1e9).toPrecision(3)}B`
  }
  if (n >= 1e6) {
    return `${(n / 1e6).toPrecision(3)}M`
  }
  if (n >= 1e3) {
    return `${(n / 1e3).toPrecision(3)}K`
  }
  return `${n}`
}

const labelProps = {
  fontSize: 14,
  textAnchor: 'middle',
}

const BinHoverTarget = styled.rect`
  pointer-events: visible;
  fill: none;

  &:hover {
    fill: rgba(0, 0, 0, 0.05);
  }
`

type OwnSiteQualityMetricsHistogramProps = {
  metric: string
  binEdges: number[]
  binValues: number[]
  metricValue?: number
  xLabel: string
  height?: number
  width?: number
}

// @ts-expect-error TS(2456) FIXME: Type alias 'SiteQualityMetricsHistogramProps' circ... Remove this comment to see the full error message
type SiteQualityMetricsHistogramProps = OwnSiteQualityMetricsHistogramProps &
  typeof SiteQualityMetricsHistogram.defaultProps

// @ts-expect-error TS(7022) FIXME: 'SiteQualityMetricsHistogram' implicitly has type ... Remove this comment to see the full error message
const SiteQualityMetricsHistogram = ({
  metric,
  binEdges,
  binValues,
  metricValue,
  xLabel,
  height,
  width,
}: SiteQualityMetricsHistogramProps) => {
  const barColor = '#73ab3d'

  const yDomain = [0, max(binValues) || 1]

  const margin = {
    bottom: 60,
    left: 60,
    right: 10,
    top: 15,
  }
  const plotWidth = width - (margin.left + margin.right)
  const plotHeight = height - (margin.top + margin.bottom)

  const bins = [...Array(binEdges.length + 1)].map((_, i) => i)
  const binLabels = [
    `< ${binEdges[0]}`,
    ...[...Array(binEdges.length - 1)].map(
      (_, i) => `between ${binEdges[i]} and ${binEdges[i + 1]}`
    ),
    `> ${binEdges[binEdges.length - 1]}`,
  ]

  const formatTooltip = (binIndex: any) => {
    return `${binValues[binIndex].toLocaleString()} variants with ${metric} ${binLabels[binIndex]}`
  }

  // @ts-expect-error TS(2345) FIXME: Argument of type 'number[]' is not assignable to p... Remove this comment to see the full error message
  const xBandScale = scaleBand().domain(bins).range([0, plotWidth])
  const bandWidth = xBandScale.bandwidth()
  const xScale = scaleLinear()
    .domain([binEdges[0], binEdges[binEdges.length - 1]])
    .range([bandWidth, plotWidth - bandWidth])

  const metricValueX = xScale(metricValue)
  const labelOnLeft = metricValueX > plotWidth * 0.8

  // @ts-expect-error TS(2345) FIXME: Argument of type '(string | number)[]' is not assi... Remove this comment to see the full error message
  const yScale = scaleLinear().domain(yDomain).range([plotHeight, 0])

  return (
    <svg height={height} width={width}>
      <line
        x1={margin.left}
        y1={margin.top + plotHeight}
        x2={margin.left + plotWidth}
        y2={margin.top + plotHeight}
        stroke="#333"
      />
      <AxisBottom
        label={xLabel}
        labelOffset={30}
        // @ts-expect-error TS(2322) FIXME: Type '{ fontSize: number; textAnchor: string; }' i... Remove this comment to see the full error message
        labelProps={labelProps}
        left={margin.left}
        top={margin.top + plotHeight}
        scale={xScale}
        stroke="#333"
        tickFormat={(value) => `${value}`}
        tickLabelProps={(value) => ({
          dx: '-0.25em',
          dy: '0.25em',
          fill: '#000',
          fontSize: 10,
          textAnchor: 'end',
          transform: `translate(0, 0), rotate(-40 ${xScale(value)}, 0)`,
        })}
        tickLength={3}
        tickValues={xScale.ticks(20)}
      />

      <AxisLeft
        label="Variants"
        // @ts-expect-error TS(2322) FIXME: Type '{ fontSize: number; textAnchor: string; }' i... Remove this comment to see the full error message
        labelProps={labelProps}
        left={margin.left}
        // @ts-expect-error TS(2345) FIXME: Argument of type 'string | number' is not assignab... Remove this comment to see the full error message
        numTicks={Math.min(10, yDomain[1])}
        tickFormat={yTickFormat}
        tickLabelProps={() => ({
          dx: '-0.25em',
          dy: '0.25em',
          fill: '#000',
          fontSize: 10,
          textAnchor: 'end',
        })}
        top={margin.top}
        scale={yScale}
        stroke="#333"
      />

      <g transform={`translate(${margin.left},${margin.top})`}>
        {metricValue !== null && (
          <>
            <path
              d="M 0 0 L -6 -7 L -2 -7 L -2 -15 L 2 -15 L 2 -7 L 6 -7 z"
              transform={`translate(${metricValueX}, 0)`}
              fill={barColor}
              stroke="#333"
              strokeWidth={1}
            />
            <line
              x1={metricValueX}
              y1={2}
              x2={metricValueX}
              y2={plotHeight}
              stroke={barColor}
              strokeWidth={1}
            />
            <text
              x={labelOnLeft ? metricValueX - 10 : metricValueX + 10}
              y={-5}
              fill="#000"
              fontSize={12}
              textAnchor={labelOnLeft ? 'end' : 'start'}
            >
              {/* @ts-expect-error TS(2554) FIXME: Expected 1 arguments, but got 2. */}
              {formatMetricValue(metricValue, metric)}
            </text>
          </>
        )}
      </g>

      <g transform={`translate(${margin.left},${margin.top})`}>
        {bins.map((binIndex) => {
          const y = yScale(binValues[binIndex])
          return (
            // @ts-expect-error TS(2345) FIXME: Argument of type 'number' is not assignable to par... Remove this comment to see the full error message
            <g key={binIndex} transform={`translate(${xBandScale(binIndex)}, 0)`}>
              <rect
                x={0}
                y={y}
                height={plotHeight - y}
                width={bandWidth}
                fill={barColor}
                stroke="#333"
                strokeWidth={1}
              />

              {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
              <TooltipAnchor tooltip={formatTooltip(binIndex)}>
                <BinHoverTarget x={0} y={0} height={plotHeight} width={bandWidth} />
              </TooltipAnchor>
            </g>
          )
        })}
      </g>
    </svg>
  )
}

SiteQualityMetricsHistogram.defaultProps = {
  metricValue: null,
  height: 250,
  width: 500,
}

// The 100% width/height container is necessary the component
// to size to fit its container vs staying at its initial size.
const GraphWrapper = styled.div`
  overflow: hidden;
  width: 100%;
  height: 100%;
  margin-bottom: 1em;
`

// @ts-expect-error TS(2339) FIXME: Property 'size' does not exist on type '{}'.
const AutosizedSiteQualityMetricsHistogram = withSize()(({ size, ...props }) => (
  <GraphWrapper>
    <SiteQualityMetricsHistogram {...props} width={size.width} />
  </GraphWrapper>
))

type MitochondrialVariantSiteQualityMetricsDistributionProps = {
  variant: MitochondrialVariantDetailPropType
}

// ================================================================================================
// Metrics components
// ================================================================================================

const MitochondrialVariantSiteQualityMetricsDistribution = ({
  variant,
}: MitochondrialVariantSiteQualityMetricsDistributionProps) => {
  const [selectedMetric, setSelectedMetric] = useState('Mean Depth')

  const selectedMetricValue = (variant as any).site_quality_metrics.find(
    ({ name }: any) => name === selectedMetric
  ).value

  const binEdges =
    gnomadV3MitochondrialVariantSiteQualityMetricDistributions[selectedMetric].bin_edges
  const binValues = [
    gnomadV3MitochondrialVariantSiteQualityMetricDistributions[selectedMetric].n_smaller || 0,
    ...gnomadV3MitochondrialVariantSiteQualityMetricDistributions[selectedMetric].bin_freq,
    gnomadV3MitochondrialVariantSiteQualityMetricDistributions[selectedMetric].n_larger || 0,
  ]

  return (
    <div>
      {/* spacer to align plot with genotype quality metrics */}
      <div style={{ height: '16px', marginBottom: '1em', marginTop: '1em' }} />

      <AutosizedSiteQualityMetricsHistogram
        // @ts-expect-error TS(2322) FIXME: Type '{ metric: string; binEdges: any; binValues: ... Remove this comment to see the full error message
        metric={selectedMetric}
        binEdges={binEdges}
        binValues={binValues}
        metricValue={selectedMetricValue}
        xLabel={selectedMetric}
      />

      <div>
        <label htmlFor="mt-site-quality-metrics-metric">
          Metric: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Select
            id="mt-site-quality-metrics-metric"
            onChange={(e: any) => {
              setSelectedMetric(e.target.value)
            }}
            value={selectedMetric}
          >
            {(variant as any).site_quality_metrics.map((metric: any) => (
              <option key={metric.name} value={metric.name}>
                {metric.name} ({' '}
                {/* @ts-expect-error TS(2554) FIXME: Expected 1 arguments, but got 2. */}
                {metric.value !== null ? formatMetricValue(metric.value, metric.name) : '–'})
              </option>
            ))}
          </Select>
        </label>
      </div>
    </div>
  )
}

type MitochondrialVariantSiteQualityMetricsTableProps = {
  variant: MitochondrialVariantDetailPropType
}

// ================================================================================================
// Table
// ================================================================================================

const MitochondrialVariantSiteQualityMetricsTable = ({
  variant,
}: MitochondrialVariantSiteQualityMetricsTableProps) => {
  return (
    // @ts-expect-error TS(2769) FIXME: No overload matches this call.
    <BaseTable style={{ width: '100%', marginTop: '1em' }}>
      <thead>
        <tr>
          <th scope="col">Metric</th>
          <th scope="col">Value</th>
        </tr>
      </thead>
      <tbody>
        {(variant as any).site_quality_metrics.map((metric: any) => (
          <tr key={metric.name}>
            <th scope="row">{metric.name}</th>
            {/* @ts-expect-error TS(2554) FIXME: Expected 1 arguments, but got 2. */}
            <td>{metric.value != null ? formatMetricValue(metric.value, metric.name) : '–'}</td>
          </tr>
        ))}
      </tbody>
    </BaseTable>
  )
}

type MitochondrialVariantSiteQualityMetricsProps = {
  variant: MitochondrialVariantDetailPropType
}

// ================================================================================================
// Tabs
// ================================================================================================

const MitochondrialVariantSiteQualityMetrics = ({
  variant,
}: MitochondrialVariantSiteQualityMetricsProps) => {
  const [selectedTab, setSelectedTab] = useState('distribution')
  return (
    <Tabs
      activeTabId={selectedTab}
      onChange={setSelectedTab}
      tabs={[
        {
          id: 'distribution',
          label: 'Metric distribution',
          render: () => <MitochondrialVariantSiteQualityMetricsDistribution variant={variant} />,
        },
        {
          id: 'values',
          label: 'All metric values',
          render: () => <MitochondrialVariantSiteQualityMetricsTable variant={variant} />,
        },
      ]}
    />
  )
}

export default MitochondrialVariantSiteQualityMetrics
