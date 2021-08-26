import { max, mean } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import PropTypes from 'prop-types'
import React, { useMemo, useState } from 'react'
import { withSize } from 'react-sizeme'
import styled from 'styled-components'
import { AxisBottom, AxisLeft } from '@vx/axis'

import { Select, TooltipAnchor } from '@gnomad/ui'

import { GNOMAD_POPULATION_NAMES } from '@gnomad/dataset-metadata/gnomadPopulations'

import { ShortTandemRepeatVariantPropType } from './ShortTandemRepeatPropTypes'

// The 100% width/height container is necessary the component
// to size to fit its container vs staying at its initial size.
const GraphWrapper = styled.div`
  overflow: hidden;
  width: 100%;
  height: 100%; /* stylelint-disable-line unit-whitelist */
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

const labelProps = {
  fontSize: 14,
  textAnchor: 'middle',
}

const ShortTandemRepeatRepeatCountsPlot = withSize()(
  ({ maxRepeats, repeats, size: { width }, thresholds }) => {
    const height = 300

    const nBins = Math.min(maxRepeats + 1, Math.floor(width / 10))
    const binSize = Math.ceil(maxRepeats / nBins)

    const data = useMemo(() => {
      const d = Array.from(Array(nBins).keys()).map((n, i) => ({
        binIndex: i,
        label: binSize === 1 ? `${n}` : `${n * binSize} - ${n * binSize + binSize - 1}`,
        count: 0,
      }))

      repeats.forEach(([repeatCount, nAlleles]) => {
        const binIndex = Math.floor(repeatCount / binSize)
        d[binIndex].count += nAlleles
      })

      return d
    }, [repeats, nBins, binSize])

    const margin = {
      bottom: binSize === 1 ? 50 : 75,
      left: 60,
      right: 10,
      top: 20,
    }

    const plotHeight = height - (margin.top + margin.bottom)

    const xScale = scaleBand()
      .domain(data.map(d => d.binIndex))
      .range([0, width - (margin.left + margin.right)])

    const xBandwidth = xScale.bandwidth()

    const yScale = scaleLinear()
      .domain([0, max(data, d => d.count) || 1])
      .range([plotHeight, 0])

    const maxNumLabels = Math.floor((width - (margin.left + margin.right)) / 20)

    const labelInterval = Math.max(Math.round(nBins / maxNumLabels), 1)

    return (
      <GraphWrapper>
        <svg height={height} width={width}>
          <AxisBottom
            label="Repeats"
            labelOffset={binSize === 1 ? 10 : 35}
            labelProps={labelProps}
            left={margin.left}
            scale={xScale}
            stroke="#333"
            tickFormat={binIndex => (binIndex % labelInterval === 0 ? data[binIndex].label : '')}
            tickLabelProps={
              binSize === 1
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
                      dx: '-0.25em',
                      dy: '0.25em',
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
            label="Alleles"
            labelProps={labelProps}
            left={margin.left}
            scale={yScale}
            stroke="#333"
            tickFormat={tickFormat}
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
            {data.map(d => (
              <React.Fragment key={`${d.binIndex}`}>
                <rect
                  x={xScale(d.binIndex)}
                  y={yScale(d.count)}
                  height={plotHeight - yScale(d.count)}
                  width={xBandwidth}
                  fill="#73ab3d"
                  stroke="#333"
                />
                <TooltipAnchor
                  tooltip={`${d.label} repeat${
                    d.label === '1' ? '' : 's'
                  }: ${d.count.toLocaleString()} allele${d.count === 1 ? '' : 's'}`}
                >
                  <TooltipTrigger
                    x={xScale(d.binIndex)}
                    y={0}
                    height={plotHeight}
                    width={xBandwidth}
                    fill="none"
                    style={{ pointerEvents: 'visible' }}
                  />
                </TooltipAnchor>
              </React.Fragment>
            ))}
          </g>

          <g transform={`translate(${margin.left}, 0)`}>
            {
              thresholds
                .filter(threshold => threshold.value <= maxRepeats)
                .sort(
                  mean(thresholds.map(threshold => threshold.value)) < maxRepeats / 2
                    ? (t1, t2) => t1.value - t2.value
                    : (t1, t2) => t2.value - t1.value
                )
                .reduce(
                  (acc, threshold) => {
                    const labelWidth = 100

                    const binIndex = Math.floor(threshold.value / binSize)
                    const positionWithBin = (threshold.value - binIndex * binSize) / binSize
                    const thresholdX = xScale(binIndex) + positionWithBin * xBandwidth

                    const labelAnchor = thresholdX >= labelWidth ? 'end' : 'start'

                    const yOffset =
                      Math.abs(thresholdX - acc.previousX) > labelWidth
                        ? 0
                        : acc.previousYOffset + 12

                    const element = (
                      <g key={threshold.label}>
                        <line
                          x1={thresholdX}
                          y1={yOffset + 2}
                          x2={thresholdX}
                          y2={height - margin.bottom}
                          stroke="#333"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={thresholdX}
                          y={yOffset}
                          dx={labelAnchor === 'end' ? -5 : 5}
                          dy="0.75em"
                          fill="#000"
                          fontSize={10}
                          textAnchor={labelAnchor}
                        >
                          {threshold.label}
                        </text>
                      </g>
                    )

                    return {
                      previousX: thresholdX,
                      previousYOffset: yOffset,
                      elements: [element, ...acc.elements],
                    }
                  },
                  {
                    previousX: Infinity,
                    previousYOffset: 0,
                    elements: [],
                  }
                ).elements
            }
          </g>
        </svg>
      </GraphWrapper>
    )
  }
)

ShortTandemRepeatRepeatCountsPlot.displayName = 'ShortTandemRepeatRepeatCountsPlot'

ShortTandemRepeatRepeatCountsPlot.propTypes = {
  maxRepeats: PropTypes.number.isRequired,
  repeats: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
  thresholds: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
    })
  ),
}

ShortTandemRepeatRepeatCountsPlot.defaultProps = {
  thresholds: [],
}

const ShortTandemRepeatRepeatCounts = ({ shortTandemRepeatVariant, thresholds }) => {
  const [selectedAncestralPopulation, setSelectedAncestralPopulation] = useState('')
  const [selectedSex, setSelectedSex] = useState('')

  const selectedPopulation = [selectedAncestralPopulation, selectedSex].filter(Boolean).join('_')

  const repeatsInSelectedPopulation =
    selectedPopulation === ''
      ? shortTandemRepeatVariant.repeats
      : shortTandemRepeatVariant.populations.find(pop => pop.id === selectedPopulation).repeats

  const ancestralPopulationIds = shortTandemRepeatVariant.populations
    .map(pop => pop.id)
    .filter(popId => !(popId.endsWith('XX') || popId.endsWith('XY')))

  return (
    <div style={{ width: '100%' }}>
      <ShortTandemRepeatRepeatCountsPlot
        maxRepeats={
          shortTandemRepeatVariant.repeats[shortTandemRepeatVariant.repeats.length - 1][0]
        }
        repeats={repeatsInSelectedPopulation}
        thresholds={thresholds}
      />
      <div>
        <label
          htmlFor={`short-tandem-repeat-${shortTandemRepeatVariant.id}-repeat-counts-population`}
        >
          Population:{' '}
          <Select
            id={`short-tandem-repeat-${shortTandemRepeatVariant.id}-repeat-counts-population`}
            value={selectedAncestralPopulation}
            onChange={e => {
              setSelectedAncestralPopulation(e.target.value)
            }}
          >
            <option value="">Global</option>
            {ancestralPopulationIds.map(popId => (
              <option key={popId} value={popId}>
                {GNOMAD_POPULATION_NAMES[popId]}
              </option>
            ))}
          </Select>
        </label>{' '}
        <label htmlFor={`short-tandem-repeat-${shortTandemRepeatVariant.id}-repeat-counts-sex`}>
          Sex:{' '}
          <Select
            id={`short-tandem-repeat-${shortTandemRepeatVariant.id}-repeat-counts-sex`}
            value={selectedSex}
            onChange={e => {
              setSelectedSex(e.target.value)
            }}
          >
            <option value="">All</option>
            <option value="XX">XX</option>
            <option value="XY">XY</option>
          </Select>
        </label>
      </div>
    </div>
  )
}

ShortTandemRepeatRepeatCounts.propTypes = {
  shortTandemRepeatVariant: ShortTandemRepeatVariantPropType.isRequired,
  thresholds: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
    })
  ),
}

ShortTandemRepeatRepeatCounts.defaultProps = {
  thresholds: [],
}

export default ShortTandemRepeatRepeatCounts
