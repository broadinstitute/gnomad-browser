import { max } from 'd3-array'
import { scaleBand, scaleLog } from 'd3-scale'
import PropTypes from 'prop-types'
import React from 'react'
import { withSize } from 'react-sizeme'
import styled from 'styled-components'
import { AxisBottom, AxisLeft } from '@vx/axis'

import { TooltipAnchor } from '@gnomad/ui'

// The 100% width/height container is necessary the component
// to size to fit its container vs staying at its initial size.
const GraphWrapper = styled.div`
  overflow: hidden;
  width: 100%;
  height: 100%; /* stylelint-disable-line unit-whitelist */
`

const labelProps = {
  fontSize: 14,
  textAnchor: 'middle',
}

const ageRangeLabel = ageRange => {
  const [minAge, maxAge] = ageRange

  if (minAge === null) {
    return `<${maxAge}`
  }
  if (maxAge === null) {
    return `>${minAge}`
  }
  return `${minAge}-${maxAge}`
}

const ShortTandemRepeatAgeDistributionPlot = withSize()(
  ({ ageDistribution, maxRepeats, size: { width } }) => {
    const height = Math.min(width, 300)

    const margin = {
      bottom: 75,
      left: 60,
      right: 10,
      top: 20,
    }

    const plotWidth = width - (margin.left + margin.right)
    const plotHeight = height - (margin.top + margin.bottom)

    const xBinSize = Math.max(1, Math.ceil(maxRepeats / (plotWidth / 10)))
    const xNumBins = Math.floor(maxRepeats / xBinSize) + 1

    const yNumBins = ageDistribution.length

    const data = Array.from(Array(xNumBins * yNumBins).keys()).map(n => {
      const xBinIndex = Math.floor(n / yNumBins)
      const yBinIndex = n % yNumBins

      const xRange =
        xBinSize === 1
          ? [xBinIndex, xBinIndex]
          : [xBinIndex * xBinSize, xBinIndex * xBinSize + xBinSize - 1]

      const xLabel =
        xBinSize === 1
          ? `${xBinIndex}`
          : `${xBinIndex * xBinSize} - ${xBinIndex * xBinSize + xBinSize - 1}`

      return {
        label: `Age ${ageRangeLabel(ageDistribution[yBinIndex].age_range)}, ${xLabel} repeats`,
        xBinIndex,
        yBinIndex,
        xRange,
        count: 0,
      }
    })

    ageDistribution.forEach((ageBin, yBinIndex) => {
      ageBin.distribution.forEach(([repeats, nAlleles]) => {
        const xBinIndex = Math.floor(repeats / xBinSize)
        data[xBinIndex * yNumBins + yBinIndex].count += nAlleles
      })
    })

    const xScale = scaleBand()
      .domain(Array.from(Array(xNumBins).keys()))
      .range([0, plotWidth])
    const xBandwidth = xScale.bandwidth()

    const yScale = scaleBand()
      .domain(Array.from(Array(yNumBins).keys()))
      .range([plotHeight, 0])
    const yBandwidth = yScale.bandwidth()

    const xMaxNumLabels = Math.floor(plotWidth / 20)
    const xLabelInterval = Math.max(Math.round(xNumBins / xMaxNumLabels), 1)

    const xTickFormat = binIndex => {
      if (binIndex % xLabelInterval !== 0) {
        return ''
      }

      if (xBinSize === 1) {
        return `${binIndex}`
      }

      return `${binIndex * xBinSize} - ${binIndex * xBinSize + xBinSize - 1}`
    }

    const yTickFormat = binIndex => {
      return ageRangeLabel(ageDistribution[binIndex].age_range)
    }

    const opacityScale = scaleLog()
      .domain([1, max(ageDistribution, ageBin => max(ageBin.distribution, d => d[1]))])
      .range([0.1, 1])

    return (
      <GraphWrapper>
        <svg height={height} width={width}>
          <AxisBottom
            label="Repeats"
            labelOffset={xBinSize === 1 ? 10 : 40}
            labelProps={labelProps}
            left={margin.left}
            scale={xScale}
            stroke="#333"
            tickFormat={xTickFormat}
            tickLabelProps={
              xBinSize === 1
                ? () => {
                    return {
                      dy: '0.25em',
                      fill: '#000',
                      fontSize: 10,
                      textAnchor: 'middle',
                    }
                  }
                : binIndex => {
                    return {
                      dx: '-0.75em',
                      dy: '0.2em',
                      fill: '#000',
                      fontSize: 10,
                      textAnchor: 'end',
                      transform: `translate(0, 0), rotate(-40 ${
                        xScale(binIndex) + xBandwidth / 2
                      }, 0)`,
                    }
                  }
            }
            top={height - margin.bottom}
          />
          <AxisLeft
            label="Age"
            labelOffset={60}
            labelProps={labelProps}
            left={margin.left}
            scale={yScale}
            stroke="#333"
            tickFormat={yTickFormat}
            tickLabelProps={() => ({
              dx: '-0.25em',
              dy: '0.25em',
              fill: '#000',
              fontSize: 10,
              textAnchor: 'end',
            })}
            top={margin.top}
          />

          <g transform={`translate(${margin.left},${margin.top})`}>
            {data
              .filter(d => d.count !== 0)
              .map(d => {
                return (
                  <React.Fragment key={`${d.xBinIndex}-${d.yBinIndex}`}>
                    <TooltipAnchor
                      tooltip={
                        <>
                          {d.label}
                          <br /> {d.count.toLocaleString()} individual{d.count === 1 ? '' : 's'}
                        </>
                      }
                    >
                      <rect
                        x={xScale(d.xBinIndex)}
                        y={yScale(d.yBinIndex)}
                        width={xBandwidth}
                        height={yBandwidth}
                        fill="#73ab3d"
                        opacity={d.count === 0 ? 0 : opacityScale(d.count)}
                        stroke="#333"
                      />
                    </TooltipAnchor>
                  </React.Fragment>
                )
              })}
          </g>
        </svg>
      </GraphWrapper>
    )
  }
)

ShortTandemRepeatAgeDistributionPlot.displayName = 'ShortTandemRepeatAgeDistributionPlot'

ShortTandemRepeatAgeDistributionPlot.propTypes = {
  ageDistribution: PropTypes.arrayOf(
    PropTypes.shape({
      age_range: PropTypes.arrayOf(PropTypes.number).isRequired,
      distribution: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
    })
  ),
  maxRepeats: PropTypes.number.isRequired,
}

export default ShortTandemRepeatAgeDistributionPlot
