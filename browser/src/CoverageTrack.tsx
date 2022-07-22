import { scaleLinear } from 'd3-scale'
import { area } from 'd3-shape'
import React, { Component } from 'react'
import styled from 'styled-components'
import { AxisLeft } from '@vx/axis'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { Track } from '@gnomad/region-viewer'
import { Button, Select } from '@gnomad/ui'

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

type OwnCoverageTrackProps = {
  datasets: {
    buckets: {
      pos: number
      mean?: number
      median?: number
    }[]
    color: string
    name: string
    opacity?: number
  }[]
  coverageOverThresholds?: number[]
  filenameForExport?: (...args: any[]) => any
  height?: number
  maxCoverage?: number
}

type CoverageTrackState = any

type CoverageTrackProps = OwnCoverageTrackProps & typeof CoverageTrack.defaultProps

class CoverageTrack extends Component<CoverageTrackProps, CoverageTrackState> {
  static defaultProps = {
    coverageOverThresholds: [],
    filenameForExport: () => 'coverage',
    height: 190,
    maxCoverage: 100,
  }

  plotElement: any

  state = {
    selectedMetric: 'mean',
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
    const { datasets, height } = this.props
    const { selectedMetric } = this.state

    const pathGenerator = area()
      .x((bucket) => scalePosition((bucket as any).pos))
      .y0(height)
      // @ts-expect-error TS(7015) FIXME: Element implicitly has an 'any' type because index... Remove this comment to see the full error message
      .y1((bucket) => scaleCoverageMetric(bucket[selectedMetric]))

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
    const { datasets, height } = this.props
    const { selectedMetric } = this.state

    const barWidth = width / totalBases - 1

    return datasets.map((dataset) => (
      <g key={dataset.name}>
        {dataset.buckets
          .filter(
            (bucket) =>
              // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
              bucket[selectedMetric] !== undefined &&
              // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
              bucket[selectedMetric] !== null &&
              isPositionDefined(bucket.pos)
          )
          .map((bucket) => {
            // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            const barHeight = height - scaleCoverageMetric(bucket[selectedMetric])
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
    const { coverageOverThresholds, datasets, height, maxCoverage } = this.props
    const { selectedMetric } = this.state

    const trackTitle =
      selectedMetric === 'mean' || selectedMetric === 'median'
        ? `Per-base ${selectedMetric} depth of coverage`
        : `Fraction of individuals with coverage over ${selectedMetric.slice(5)}`

    return (
      <Track
        renderLeftPanel={() => <TitlePanel>{trackTitle}</TitlePanel>}
        renderTopPanel={() => (
          <TopPanel>
            <Legend datasets={datasets} />
            {/* eslint-disable-next-line jsx-a11y/label-has-for */}
            <label htmlFor="coverage-metric">
              Metric: {/* @ts-expect-error TS2769: No overload matches this call. */}
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
                {coverageOverThresholds.length > 0 && (
                  <optgroup label="Fraction of individuals with coverage over X">
                    {coverageOverThresholds.map((threshold) => (
                      <option key={`${threshold}`} value={`over_${threshold}`}>
                        Over {threshold}
                      </option>
                    ))}
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
            .domain(
              selectedMetric === 'mean' || selectedMetric === 'median' ? [0, maxCoverage] : [0, 1]
            )
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
