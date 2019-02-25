import { scaleLinear } from 'd3-scale'
import { area } from 'd3-shape'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'
import { AxisLeft } from '@vx/axis'

import { Track } from '@broad/region-viewer'
import { Button } from '@broad/ui'

import { Legend } from './Legend'

const TopPanel = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
`

export class CoverageTrack extends Component {
  static propTypes = {
    datasets: PropTypes.arrayOf(
      PropTypes.shape({
        buckets: PropTypes.arrayOf(
          PropTypes.shape({
            pos: PropTypes.number.isRequired,
            mean: PropTypes.number,
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

    return (
      <Track
        renderLeftPanel={null}
        renderTopPanel={() => (
          <TopPanel>
            <Legend datasets={datasets} />
            <Button onClick={() => this.exportPlot()}>Save plot</Button>
          </TopPanel>
        )}
      >
        {({ offsetRegions, scalePosition, width }) => {
          const scaleCoverageMetric = scaleLinear()
            .domain([0, 100])
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
