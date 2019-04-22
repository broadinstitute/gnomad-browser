import { max } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import React from 'react'
import { withSize } from 'react-sizeme'
import styled from 'styled-components'
import { AxisBottom, AxisLeft } from '@vx/axis'

import { TooltipAnchor } from '@broad/ui'

import StructuralVariantDetailPropType from './StructuralVariantDetailPropType'

// The 100% width/height container is necessary the component
// to size to fit its container vs staying at its initial size.
const GraphWrapper = styled.div`
  overflow: hidden;
  width: 100%;
  height: 100%; /* stylelint-disable-line unit-whitelist */
  margin-bottom: 1em;
`

const TooltipTrigger = styled.rect`
  pointer-events: visible;

  &:hover {
    fill: rgba(0, 0, 0, 0.05);
  }
`

const tickFormat = n => {
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

const margin = {
  bottom: 50,
  left: 60,
  right: 10,
  top: 10,
}

const labelProps = {
  fontSize: 14,
  textAnchor: 'middle',
}

const HistogramTooltip = ({ ac, copyNumber }) => (
  <span>
    CN={copyNumber}: {ac} samples
  </span>
)

const MultiallelicCopyNumberVariantPlot = withSize()(({ variant, size: { width } }) => {
  const height = 250

  const xScale = scaleBand()
    .domain(variant.copy_numbers.map(({ copy_number: copyNumber }) => copyNumber))
    .range([0, width - (margin.left + margin.right)])

  const yScale = scaleLinear()
    .domain([0, max(variant.copy_numbers, d => d.ac) || 1])
    .range([height - (margin.top + margin.bottom), margin.top])

  const labelInterval = Math.max(Math.round(variant.copy_numbers.length / 100) * 10, 1)

  return (
    <GraphWrapper>
      <svg height={height} width={width}>
        <AxisBottom
          label="Copy Number"
          labelProps={labelProps}
          left={margin.left}
          scale={xScale}
          stroke="#333"
          tickFormat={(copyNumber, i) => (i % labelInterval === 0 ? copyNumber : '')}
          top={height - margin.bottom}
        />
        <AxisLeft
          label="Samples"
          labelProps={labelProps}
          left={margin.left}
          scale={yScale}
          stroke="#333"
          tickFormat={tickFormat}
          top={margin.top}
        />
        <g transform={`translate(${margin.left},${margin.top})`}>
          {variant.copy_numbers.map(({ copy_number: copyNumber, ac }) => (
            <React.Fragment key={copyNumber}>
              <rect
                x={xScale(copyNumber)}
                y={yScale(ac)}
                height={yScale(0) - yScale(ac)}
                width={xScale.bandwidth()}
                fill={copyNumber === 2 ? '#bdbdbd' : '#73ab3d'}
                stroke="#333"
              />
              <TooltipAnchor tooltipComponent={HistogramTooltip} ac={ac} copyNumber={copyNumber}>
                <TooltipTrigger
                  x={xScale(copyNumber)}
                  y={yScale.range()[1]}
                  height={yScale.range()[0] - yScale.range()[1]}
                  width={xScale.bandwidth()}
                  fill="none"
                  style={{ pointerEvents: 'visible' }}
                />
              </TooltipAnchor>
            </React.Fragment>
          ))}
        </g>
      </svg>
    </GraphWrapper>
  )
})

MultiallelicCopyNumberVariantPlot.displayName = 'MultiallelicCopyNumberVariantPlot'

MultiallelicCopyNumberVariantPlot.propTypes = {
  variant: StructuralVariantDetailPropType.isRequired,
}

export default MultiallelicCopyNumberVariantPlot
