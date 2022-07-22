import { scaleLinear } from 'd3-scale'
import React from 'react'
import styled from 'styled-components'

import { TooltipAnchor } from '@gnomad/ui'

const BinHoverTarget = styled.rect`
  pointer-events: visible;
  fill: none;

  &:hover {
    fill: rgba(0, 0, 0, 0.05);
  }
`

type OwnProps = {
  categoryColor?: (...args: any[]) => any
  formatTooltip: (...args: any[]) => any
  height?: number
  scalePosition: (...args: any[]) => any
  variantCategory?: (...args: any[]) => any
  variantCategories?: string[]
  variants: any[]
  width: number
}

// @ts-expect-error TS(2456) FIXME: Type alias 'Props' circularly references itself.
type Props = OwnProps & typeof BinnedVariantsPlot.defaultProps

// @ts-expect-error TS(7022) FIXME: 'BinnedVariantsPlot' implicitly has type 'any' bec... Remove this comment to see the full error message
const BinnedVariantsPlot = ({
  categoryColor,
  formatTooltip,
  height,
  scalePosition,
  variantCategory,
  variantCategories,
  variants,
  width,
}: Props) => {
  const nBins = Math.min(100, Math.floor(width / 8))
  const binWidth = width / nBins
  const binPadding = 1

  const initialCategoryCounts = variantCategories.reduce(
    // @ts-expect-error TS(7006) FIXME: Parameter 'acc' implicitly has an 'any' type.
    (acc, category) => ({
      ...acc,
      [category]: 0,
    }),
    {}
  )
  const bins = [...Array(nBins)].map(() => ({ ...initialCategoryCounts }))

  const variantBinIndex = (variant: any) => {
    const variantPosition = scalePosition(variant.pos)
    return Math.floor(variantPosition / binWidth)
  }

  variants.forEach((variant: any) => {
    const category = variantCategory(variant)
    const binIndex = variantBinIndex(variant)
    if (binIndex >= 0 && binIndex < bins.length) {
      bins[binIndex][category] += 1
    }
  })

  const maxVariantsInBin = bins.reduce((max, bin) => {
    const binTotal = Object.values(bin).reduce((a: any, b: any) => a + b, 0)
    // @ts-expect-error TS(2345) FIXME: Argument of type 'unknown' is not assignable to pa... Remove this comment to see the full error message
    return Math.max(max, binTotal)
  }, 1)

  const y = scaleLinear().domain([0, maxVariantsInBin]).range([0, height])

  return (
    <svg height={height} width={width} style={{ overflow: 'visible' }}>
      <g>
        <text x={-7} y={0} dy="0.3em" textAnchor="end">
          {maxVariantsInBin}
        </text>
        <line x1={-5} y1={0} x2={0} y2={0} stroke="#000" strokeWidth={1} />

        <text x={-7} y={height} dy="0.3em" textAnchor="end">
          0
        </text>
        <line x1={-5} y1={height} x2={0} y2={height} stroke="#000" strokeWidth={1} />

        <line x1={0} y1={0} x2={0} y2={height} stroke="#000" strokeWidth={1} />
      </g>
      <g>
        {bins.map((bin, binIndex) => {
          let yOffset = 0
          return (
            // eslint-disable-next-line react/no-array-index-key
            <g key={binIndex} transform={`translate(${binIndex * binWidth + binPadding},0)`}>
              {variantCategories.map((category: any) => {
                const barHeight = y(bin[category])
                const bar = (
                  <rect
                    key={category}
                    x={binPadding}
                    y={height - yOffset - barHeight}
                    width={binWidth - binPadding * 2}
                    height={barHeight}
                    fill={categoryColor(category)}
                  />
                )
                yOffset += barHeight
                return bar
              })}
              {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: any; }' is not... Remove this comment to see the full error message */}
              <TooltipAnchor tooltip={formatTooltip(bin)}>
                <BinHoverTarget x={0} y={0} height={height} width={binWidth} />
              </TooltipAnchor>
            </g>
          )
        })}
      </g>
      <line x1={0} y1={height} x2={width} y2={height} stroke="#000" />
    </svg>
  )
}

BinnedVariantsPlot.defaultProps = {
  categoryColor: () => '#424242',
  height: 50,
  variantCategory: () => 'undefined',
  variantCategories: ['undefined'],
}

export default BinnedVariantsPlot
