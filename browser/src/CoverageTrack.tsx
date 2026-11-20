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
  // Allele number. AoU reference blocks carry no DP, so for v5 genomes the
  // depth-based metrics above are not meaningful and AN is the callability
  // signal instead.
  //
  // an_percent is AN%, gnomAD's existing published term for AN/2N -- "percent of
  // total possible AN observed at site". Already used in the Low exome coverage
  // gene flag (median AN% > 90%) and in constraint.md (AN percent >= 20), so the
  // axis is a percent to match those thresholds.
  //
  // Named an_percent internally but surfaced as "Callrate", which is the term
  // readers of a coverage track expect. The two are not strictly synonymous --
  // gnomad_methods describes AN only as a *proxy* for call rate, and AN% is
  // adj-filtered, allele-level rather than sample-level, and assumes diploid --
  // so the axis label keeps "(Allele Number %)" and the help topic states the
  // adj thresholds that define it.
  an_percent = 'an_percent',
  an = 'an',
}

const AN_METRICS: MetricOptions[] = [MetricOptions.an_percent, MetricOptions.an]

const isANMetric = (metric: MetricOptions) => AN_METRICS.includes(metric)

type OwnCoverageTrackProps = {
  datasets: {
    buckets: {
      pos: number
      mean?: number
      median?: number
      an?: number
      an_percent?: number
    }[]
    color: string
    name: string
    opacity?: number
  }[]
  // AN series, supplied separately from the coverage series. They are NOT
  // merged into `datasets`: AN and coverage are bucketed independently (and
  // exome AN covers a different base set than exome coverage), so a merge
  // would require aligning two bucket grids that need not line up. Passing
  // this prop is also what enables the AN metrics in the selector.
  anDatasets?: OwnCoverageTrackProps['datasets']
  coverageOverThresholds?: number[]
  filenameForExport?: (...args: any[]) => any
  height?: number
  maxCoverage?: number
  datasetId: DatasetId
  metric?: MetricOptions
}

type CoverageTrackState = { selectedMetric: MetricOptions }

type CoverageTrackProps = OwnCoverageTrackProps & typeof CoverageTrack.defaultProps

class CoverageTrack extends Component<CoverageTrackProps, CoverageTrackState> {
  static defaultProps = {
    filenameForExport: () => 'coverage',
    height: 190,
    maxCoverage: 100,
  }

  plotElement: any

  constructor(props: CoverageTrackProps) {
    super(props)
    let selectedMetric
    if (this.props.metric) {
      selectedMetric = this.props.metric
    } else if (isV4(this.props.datasetId)) {
      selectedMetric = MetricOptions.over_20
    } else {
      selectedMetric = MetricOptions.mean
    }
    this.state = { selectedMetric }
  }

  /** The series to draw: AN series under an AN metric, coverage series otherwise. */
  activeDatasets = () => {
    const { anDatasets, datasets } = this.props
    return isANMetric(this.state.selectedMetric) && anDatasets ? anDatasets : datasets
  }

  /**
   * Resolve the plotted value for a bucket under the current metric.
   *
   * Every metric reads straight off the bucket -- the AN series is shaped like the
   * coverage series. Absent values are normalised to null rather than undefined so
   * the existing null-filtering in renderBars and renderArea still applies; the API
   * returns null for a bucket with no data, and `an_percent` is null where the
   * attainable AN is zero.
   */
  metricValue = (bucket: any) => {
    const value = bucket[this.state.selectedMetric]
    return value === undefined ? null : value
  }

  /**
   * Axis ceiling for raw AN, derived from the data actually on screen.
   *
   * Raw AN has no natural ceiling: it scales with sample count, so it differs by
   * an order of magnitude between series (v4.1 exomes 2N ~ 1.46M vs v4.1 genomes
   * 2N ~ 152k) and again between releases. A constant would clip one series or
   * flatten the other, so the axis follows the data on screen. This is why AN% is
   * the better default -- it is already normalised.
   */
  anAxisMax = () => {
    let max = 0
    this.activeDatasets().forEach((dataset: any) => {
      dataset.buckets.forEach((bucket: any) => {
        const value = this.metricValue(bucket)
        if (typeof value === 'number' && Number.isFinite(value) && value > max) {
          max = value
        }
      })
    })
    return max > 0 ? max * 1.05 : 1
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
      .defined((bucket) => {
        const value = this.metricValue(bucket)
        return value !== undefined && value !== null
      })
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
          .filter((bucket: any) => {
            const value = this.metricValue(bucket)
            return value !== undefined && value !== null && isPositionDefined(bucket.pos)
          })
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
    const { anDatasets, coverageOverThresholds, height, maxCoverage } = this.props
    const { selectedMetric } = this.state
    const datasets = this.activeDatasets()
    // Once per render: drives both the axis domain and the tick unit.
    const anMax = selectedMetric === MetricOptions.an ? this.anAxisMax() : 0

    const showANMetrics = Boolean(anDatasets)

    let trackTitle: string
    if (selectedMetric === MetricOptions.mean || selectedMetric === MetricOptions.median) {
      trackTitle = `Per-base ${selectedMetric} depth of coverage`
    } else if (selectedMetric === MetricOptions.an_percent) {
      trackTitle = 'Callrate (Allele Number %)'
    } else if (selectedMetric === MetricOptions.an) {
      trackTitle = 'Allele number (AN)'
    } else {
      trackTitle = `Fraction of individuals with coverage over ${selectedMetric.slice(5)}`
    }
    // Help topic per metric. Raw AN is an absolute count; Callrate is a rate with a
    // ploidy-aware denominator -- pointing both at one topic described the wrong thing.
    let titleHelpTopic: string | null = null
    if (selectedMetric === MetricOptions.an_percent) {
      titleHelpTopic = 'callrate'
    } else if (selectedMetric === MetricOptions.an) {
      titleHelpTopic = 'allele-number'
    }

    return (
      <Track
        renderLeftPanel={() => (
          <TitlePanel>
            {trackTitle}
            {/* Click-to-open help, same pattern as RegionalConstraintTrack. Copy lives
                in browser/help/topics/{callrate,allele-number}.md. */}
            {titleHelpTopic && <InfoButton topic={titleHelpTopic} />}
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
                {showANMetrics && (
                  <optgroup label="Allele number">
                    <option value={MetricOptions.an_percent}>Callrate</option>
                    <option value={MetricOptions.an}>Allele number (AN)</option>
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
          // AN% runs 0-100 (matching the documented >90% / >=20 thresholds), raw
          // AN is an absolute count, over_X is a 0-1 fraction.
          let domain
          if (selectedMetric === MetricOptions.mean || selectedMetric === MetricOptions.median) {
            domain = [0, maxCoverage]
          } else if (selectedMetric === MetricOptions.an) {
            // Follows the data on screen; see anAxisMax. `|| 1` guards an
            // all-null series, which would otherwise give a zero-width domain.
            domain = [0, anMax || 1]
          } else if (selectedMetric === MetricOptions.an_percent) {
            domain = [0, 100]
          } else {
            domain = [0, 1]
          }
          const scaleCoverageMetric = scaleLinear().domain(domain).range([height, 7])

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
                  // Raw AN reaches ~10^6 (v4.1 exomes are 730,947 samples, so
                  // 2N ~ 1.46M); the default formatter overflows the 60px axis
                  // gutter, so abbreviate to k / M.
                  tickFormat={
                    // eslint-disable-next-line no-nested-ternary
                    selectedMetric === MetricOptions.an
                      ? (value: any) => {
                          // Unit chosen from the axis ceiling, not per tick: the axis
                          // follows the data and spans ~152k (v4.1 genomes 2N) to
                          // ~1.46M (v4.1 exomes 2N), and less on a short region.
                          // Per-tick formatting printed small ticks as "0k" and
                          // mixed "5,000" with "10k" on one axis.
                          const n = Number(value)
                          if (anMax < 1e4) return n.toLocaleString()
                          if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
                          return `${Math.round(n / 1000).toLocaleString()}k`
                        }
                      : selectedMetric === MetricOptions.an_percent
                      ? (value: any) => `${Number(value)}%`
                      : undefined
                  }
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
