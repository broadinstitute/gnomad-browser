import { scaleLinear } from 'd3-scale'
import { area } from 'd3-shape'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'
import { AxisLeft } from '@vx/axis'

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
    background: ${props => props.color};
    opacity: ${props => props.opacity};
  }
`

const Legend = ({ datasets }) => (
  <LegendWrapper>
    {datasets.map(dataset => (
      <LegendItem key={dataset.name}>
        <LegendSwatch color={dataset.color} opacity={dataset.opacity} />
        {dataset.name}
      </LegendItem>
    ))}
  </LegendWrapper>
)

Legend.propTypes = {
  datasets: PropTypes.arrayOf(
    PropTypes.shape({
      color: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      opacity: PropTypes.number,
    })
  ).isRequired,
}

const TitlePanel = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  padding-right: 40px;
`

class CoverageTrack extends Component {
  static propTypes = {
    datasets: PropTypes.arrayOf(
      PropTypes.shape({
        buckets: PropTypes.arrayOf(
          PropTypes.shape({
            pos: PropTypes.number.isRequired,
            mean: PropTypes.number,
            median: PropTypes.number,
          })
        ).isRequired,
        color: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        // Opacity must be separate from fill color for SVG export because
        // some programs do not recognize RGBA fill colors.
        opacity: PropTypes.number,
      })
    ).isRequired,
    coverageOverThresholds: PropTypes.arrayOf(PropTypes.number),
    filenameForExport: PropTypes.func,
    height: PropTypes.number,
    maxCoverage: PropTypes.number,
  }

  static defaultProps = {
    coverageOverThresholds: [],
    filenameForExport: () => 'coverage',
    height: 190,
    maxCoverage: 100,
  }

  state = {
    selectedMetric: 'mean',
  }

  plotRef = el => {
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

  renderArea({ scaleCoverageMetric, scalePosition }) {
    const { datasets, height } = this.props
    const { selectedMetric } = this.state

    const pathGenerator = area()
      .x(bucket => scalePosition(bucket.pos))
      .y0(height)
      .y1(bucket => scaleCoverageMetric(bucket[selectedMetric]))

    return datasets.map(dataset => (
      <g key={dataset.name}>
        <path
          d={pathGenerator(dataset.buckets)}
          fill={dataset.color}
          fillOpacity={dataset.opacity}
        />
      </g>
    ))
  }

  renderBars({ isPositionDefined, scaleCoverageMetric, scalePosition, totalBases, width }) {
    const { datasets, height } = this.props
    const { selectedMetric } = this.state

    const barWidth = width / totalBases - 1

    return datasets.map(dataset => (
      <g key={dataset.name}>
        {dataset.buckets
          .filter(
            bucket =>
              bucket[selectedMetric] !== undefined &&
              bucket[selectedMetric] !== null &&
              isPositionDefined(bucket.pos)
          )
          .map(bucket => {
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

  renderPlot({ isPositionDefined, regions, scaleCoverageMetric, scalePosition, width }) {
    const totalBases = regions.reduce((acc, region) => acc + region.stop - region.start, 0)
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
              Metric:{' '}
              <Select
                id="coverage-metric"
                value={selectedMetric}
                onChange={e => {
                  this.setState({ selectedMetric: e.target.value })
                }}
              >
                <optgroup label="Per-base depth of coverage">
                  <option value="mean">Mean</option>
                  <option value="median">Median</option>
                </optgroup>
                {coverageOverThresholds.length > 0 && (
                  <optgroup label="Fraction of individuals with coverage over X">
                    {coverageOverThresholds.map(threshold => (
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
        {({ isPositionDefined, regions, scalePosition, width }) => {
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
