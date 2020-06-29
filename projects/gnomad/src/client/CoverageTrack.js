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

class CoverageTrack extends Component {
  static propTypes = {
    datasets: PropTypes.arrayOf(
      PropTypes.shape({
        buckets: PropTypes.arrayOf(
          PropTypes.shape({
            pos: PropTypes.number.isRequired,
            mean: PropTypes.number,
            median: PropTypes.number,
            over_1: PropTypes.number,
            over_5: PropTypes.number,
            over_10: PropTypes.number,
            over_15: PropTypes.number,
            over_20: PropTypes.number,
            over_25: PropTypes.number,
            over_30: PropTypes.number,
            over_50: PropTypes.number,
            over_100: PropTypes.number,
          })
        ).isRequired,
        color: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        // Opacity must be separate from fill color for SVG epxort because
        // some programs do not recognize RGBA fill colors.
        opacity: PropTypes.number,
      })
    ).isRequired,
    filenameForExport: PropTypes.func,
    height: PropTypes.number,
  }

  static defaultProps = {
    filenameForExport: () => 'coverage',
    height: 190,
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

  renderBars({ offsetRegions, scaleCoverageMetric, scalePosition, totalBases, width }) {
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
              offsetRegions.some(region => region.start <= bucket.pos && region.stop >= bucket.pos)
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

  renderPlot({ offsetRegions, scaleCoverageMetric, scalePosition, width }) {
    const totalBases = offsetRegions.reduce((acc, region) => acc + region.stop - region.start, 0)
    return totalBases < 100
      ? this.renderBars({ offsetRegions, scaleCoverageMetric, scalePosition, totalBases, width })
      : this.renderArea({ offsetRegions, scaleCoverageMetric, scalePosition, totalBases, width })
  }

  render() {
    const { datasets, height } = this.props
    const { selectedMetric } = this.state

    return (
      <Track
        renderLeftPanel={null}
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
                <optgroup label="Fraction of individuals with coverage over X">
                  <option value="over_1">Over 1</option>
                  <option value="over_5">Over 5</option>
                  <option value="over_10">Over 10</option>
                  <option value="over_15">Over 15</option>
                  <option value="over_20">Over 20</option>
                  <option value="over_25">Over 25</option>
                  <option value="over_30">Over 30</option>
                  <option value="over_50">Over 50</option>
                  <option value="over_100">Over 100</option>
                </optgroup>
              </Select>
            </label>
            <Button style={{ marginLeft: '1em' }} onClick={() => this.exportPlot()}>
              Save plot
            </Button>
          </TopPanel>
        )}
      >
        {({ offsetRegions, scalePosition, width }) => {
          const scaleCoverageMetric = scaleLinear()
            .domain(selectedMetric === 'mean' || selectedMetric === 'median' ? [0, 100] : [0, 1])
            .range([height, 7])

          const axisWidth = 60
          return (
            <div style={{ marginLeft: -axisWidth }}>
              <svg ref={this.plotRef} height={height} width={axisWidth + width}>
                <AxisLeft
                  hideZero
                  label="Coverage"
                  labelProps={{
                    fontSize: 14,
                    textAnchor: 'middle',
                  }}
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
                  {this.renderPlot({ offsetRegions, scalePosition, scaleCoverageMetric, width })}
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
