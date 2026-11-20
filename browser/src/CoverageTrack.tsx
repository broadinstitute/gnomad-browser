import { scaleLinear } from 'd3-scale'
import { area } from 'd3-shape'
import React, { Component } from 'react'
import styled from 'styled-components'
import { AxisLeft } from '@visx/axis'

import { Track } from '@gnomad/region-viewer'
import { Button, Select } from '@gnomad/ui'
import { DatasetId, isV4 } from '@gnomad/dataset-metadata/metadata'
import InfoButton from './help/InfoButton'

const TopPanel = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
`

const LegendWrapper = styled.ul`
  display: flex;
  flex-direction: row;
  padding: 0;
  margin: 0 1em 0 0;
  list-style-type: none;
`

const LegendItem = styled.li`
  display: flex;
  margin-left: 1em;
`

const LegendSwatch = styled.span`
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 1px solid black;
  margin-right: 0.5em;

  &::before {
    content: '';
    display: inline-block;
    width: 1em;
    height: 1em;
    background: ${(props: any) => props.color};
    opacity: ${(props: any) => props.opacity};
  }
`

type LegendProps = {
  datasets: {
    color: string
    name: string
    opacity?: number
  }[]
}

const Legend = ({ datasets }: LegendProps) => (
  <LegendWrapper>
    {datasets.map((dataset) => (
      <LegendItem key={dataset.name}>
        {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
        <LegendSwatch color={dataset.color} opacity={dataset.opacity} />
        {dataset.name}
      </LegendItem>
    ))}
  </LegendWrapper>
)

const TitlePanel = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  padding-right: 40px;
`

export enum MetricOptions {
  mean = 'mean',
  median = 'median',
  over_1 = 'over_1',
  over_5 = 'over_5',
  over_10 = 'over_10',
  over_15 = 'over_15',
  over_20 = 'over_20',
  over_25 = 'over_25',
  over_30 = 'over_30',
  over_50 = 'over_50',
  over_100 = 'over_100',
  an_percent = 'an_percent',
}

/** Metrics read from the allele number series rather than the coverage series. */
export const isAlleleNumberMetric = (metric: MetricOptions) => metric === MetricOptions.an_percent

/** The metric to show when there is no call rate and the caller named none. */
export const defaultCoverageMetric = (datasetId: DatasetId) =>
  isV4(datasetId) ? MetricOptions.over_20 : MetricOptions.mean

export const trackTitleForMetric = (metric: MetricOptions) => {
  if (isAlleleNumberMetric(metric)) {
    return 'Call rate (AN%)'
  }
  if (metric === MetricOptions.mean || metric === MetricOptions.median) {
    return `Per-base ${metric} depth of coverage`
  }
  return `Fraction of individuals with coverage over ${metric.slice('over_'.length)}`
}

/** The y-axis extent for a metric: a percentage, a read depth, or a fraction. */
export const domainForMetric = (metric: MetricOptions, maxCoverage: number): [number, number] => {
  if (isAlleleNumberMetric(metric)) {
    return [0, 100]
  }
  if (metric === MetricOptions.mean || metric === MetricOptions.median) {
    return [0, maxCoverage]
  }
  return [0, 1]
}

const formatPercentTick = (value: any) => `${value}%`

export const tickFormatForMetric = (metric: MetricOptions) =>
  isAlleleNumberMetric(metric) ? formatPercentTick : undefined

type CoverageTrackDataset = {
  buckets: {
    pos: number
    mean?: number
    median?: number
    an_percent?: number
  }[]
  color: string
  name: string
  opacity?: number
}

type OwnCoverageTrackProps = {
  datasets: CoverageTrackDataset[]
  alleleNumberDatasets?: CoverageTrackDataset[]
  isAlleleNumberLoading?: boolean
  coverageOverThresholds?: number[]
  filenameForExport?: (...args: any[]) => any
  height?: number
  maxCoverage?: number
  datasetId: DatasetId
  metric?: MetricOptions
}

type CoverageTrackState = { selectedMetric: MetricOptions }

type CoverageTrackProps = OwnCoverageTrackProps & typeof CoverageTrack.defaultProps

const offersAlleleNumber = (props: CoverageTrackProps) =>
  Boolean(props.isAlleleNumberLoading || props.alleleNumberDatasets?.length)

const initialMetric = (props: CoverageTrackProps) => {
  if (props.metric) {
    return props.metric
  }
  return offersAlleleNumber(props)
    ? MetricOptions.an_percent
    : defaultCoverageMetric(props.datasetId)
}

class CoverageTrack extends Component<CoverageTrackProps, CoverageTrackState> {
  static defaultProps = {
    filenameForExport: () => 'coverage',
    height: 190,
    maxCoverage: 100,
  }

  plotElement: any

  constructor(props: CoverageTrackProps) {
    super(props)
    this.state = { selectedMetric: initialMetric(props) }
  }

  componentDidUpdate(prevProps: CoverageTrackProps) {
    // An allele number request that settles with nothing leaves the reader
    // looking at an empty call rate plot, so fall back to a coverage metric.
    // Guarded on a transition between props, so it cannot loop, and it leaves
    // a metric the reader chose for themselves alone.
    const wasOffered = offersAlleleNumber(prevProps)
    const isOffered = offersAlleleNumber(this.props)

    if (wasOffered && !isOffered && isAlleleNumberMetric(this.state.selectedMetric)) {
      this.setState({ selectedMetric: defaultCoverageMetric(this.props.datasetId) })
    }
  }

  /** The series to draw: the allele number series under a call rate metric. */
  activeDatasets = () => {
    const { alleleNumberDatasets, datasets } = this.props
    return isAlleleNumberMetric(this.state.selectedMetric) && alleleNumberDatasets?.length
      ? alleleNumberDatasets
      : datasets
  }

  metricValue = (bucket: any) => {
    const value = bucket[this.state.selectedMetric]
    return value === undefined ? null : value
  }

  plotRef = (el: any) => {
    this.plotElement = el
  }

  exportPlot() {
    const { filenameForExport } = this.props
    const { selectedMetric } = this.state

    const serializer = new XMLSerializer()
    const data = serializer.serializeToString(this.plotElement)

    const blob = new Blob(['<?xml version="1.0" standalone="no"?>\r\n', data], {
      type: 'image/svg+xml;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filenameForExport({ selectedMetric })}.svg`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  renderArea({ scaleCoverageMetric, scalePosition }: any) {
    const { height } = this.props
    const datasets = this.activeDatasets()

    const pathGenerator = area()
      // Buckets without a value for this metric break the path rather than
      // being drawn at zero, which would put a callability cliff in the plot
      // that is not in the data.
      .defined((bucket) => this.metricValue(bucket) !== null)
      .x((bucket) => scalePosition((bucket as any).pos))
      .y0(height)
      .y1((bucket) => scaleCoverageMetric(this.metricValue(bucket)))

    return datasets.map((dataset) => (
      <g key={dataset.name}>
        <path
          // @ts-expect-error TS(2769) FIXME: No overload matches this call.
          d={pathGenerator(dataset.buckets)}
          fill={dataset.color}
          fillOpacity={dataset.opacity}
        />
      </g>
    ))
  }

  renderBars({ isPositionDefined, scaleCoverageMetric, scalePosition, totalBases, width }: any) {
    const { height } = this.props
    const datasets = this.activeDatasets()

    const barWidth = width / totalBases - 1

    return datasets.map((dataset: any) => (
      <g key={dataset.name}>
        {dataset.buckets
          .filter(
            (bucket: any) => this.metricValue(bucket) !== null && isPositionDefined(bucket.pos)
          )
          .map((bucket: any) => {
            const barHeight = height - scaleCoverageMetric(this.metricValue(bucket))
            const x = scalePosition(bucket.pos)
            return (
              <rect
                key={bucket.pos}
                x={x}
                y={height - barHeight}
                width={barWidth}
                height={barHeight}
                fill={dataset.color}
                fillOpacity={dataset.opacity}
                stroke="none"
              />
            )
          })}
      </g>
    ))
  }

  renderPlot({ isPositionDefined, regions, scaleCoverageMetric, scalePosition, width }: any) {
    const totalBases = regions.reduce(
      (acc: any, region: any) => acc + region.stop - region.start,
      0
    )
    return totalBases < 100
      ? this.renderBars({
          isPositionDefined,
          scaleCoverageMetric,
          scalePosition,
          totalBases,
          width,
        })
      : this.renderArea({
          isPositionDefined,
          scaleCoverageMetric,
          scalePosition,
          totalBases,
          width,
        })
  }

  render() {
    const { coverageOverThresholds, height, maxCoverage } = this.props
    const { selectedMetric } = this.state
    const datasets = this.activeDatasets()

    const trackTitle = trackTitleForMetric(selectedMetric)

    return (
      <Track
        renderLeftPanel={() => (
          <TitlePanel>
            {isAlleleNumberMetric(selectedMetric) ? (
              // Call rate is the only metric with a help topic. The title panel
              // is a column, so the title and the button need a row of their own.
              <span>
                {trackTitle} <InfoButton topic="call-rate" />
              </span>
            ) : (
              trackTitle
            )}
          </TitlePanel>
        )}
        renderTopPanel={() => (
          <TopPanel>
            <Legend datasets={datasets} />
            {/* eslint-disable-next-line jsx-a11y/label-has-for */}
            <label htmlFor="coverage-metric">
              Metric:{' '}
              <Select
                id="coverage-metric"
                value={selectedMetric}
                onChange={(e: any) => {
                  this.setState({ selectedMetric: e.target.value })
                }}
              >
                <optgroup label="Per-base depth of coverage">
                  <option value="mean">Mean</option>
                  <option value="median">Median</option>
                </optgroup>
                {coverageOverThresholds && (
                  <optgroup label="Fraction of individuals with coverage over X">
                    {coverageOverThresholds.map((threshold) => (
                      <option key={`${threshold}`} value={`over_${threshold}`}>
                        Over {threshold}
                      </option>
                    ))}
                  </optgroup>
                )}
                {offersAlleleNumber(this.props) && (
                  <optgroup label="Allele number">
                    <option value={MetricOptions.an_percent}>Call rate</option>
                  </optgroup>
                )}
              </Select>
            </label>
            <Button style={{ marginLeft: '1em' }} onClick={() => this.exportPlot()}>
              Save plot
            </Button>
          </TopPanel>
        )}
      >
        {({ isPositionDefined, regions, scalePosition, width }: any) => {
          const scaleCoverageMetric = scaleLinear()
            .domain(domainForMetric(selectedMetric, maxCoverage))
            .range([height, 7])

          const axisWidth = 60
          return (
            <div style={{ marginLeft: -axisWidth }}>
              <svg ref={this.plotRef} height={height} width={axisWidth + width}>
                <AxisLeft
                  hideZero
                  left={axisWidth}
                  tickLabelProps={() => ({
                    dx: '-0.25em',
                    dy: '0.25em',
                    fill: '#000',
                    fontSize: 10,
                    textAnchor: 'end',
                  })}
                  tickFormat={tickFormatForMetric(selectedMetric)}
                  scale={scaleCoverageMetric}
                  stroke="#333"
                />
                <g transform={`translate(${axisWidth},0)`}>
                  {this.renderPlot({
                    isPositionDefined,
                    regions,
                    scalePosition,
                    scaleCoverageMetric,
                    width,
                  })}
                  <line x1={0} y1={height} x2={width} y2={height} stroke="#333" />
                </g>
              </svg>
            </div>
          )
        }}
      </Track>
    )
  }
}

export default CoverageTrack
