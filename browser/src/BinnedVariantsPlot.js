import { scaleLinear } from 'd3-scale'
import PropTypes from 'prop-types'
import React from 'react'

const BinnedVariantsPlot = ({
  categoryColor,
  height,
  scalePosition,
  variantCategory,
  variantCategories,
  variants,
  width,
}) => {
  const nBins = Math.min(100, Math.floor(width / 8))
  const binWidth = width / nBins
  const binPadding = 1

  const initialCategoryCounts = variantCategories.reduce(
    (acc, category) => ({ ...acc, [category]: 0 }),
    {}
  )
  const bins = [...Array(nBins)].map(() => ({ ...initialCategoryCounts }))

  const variantBinIndex = variant => {
    const variantPosition = scalePosition(variant.pos)
    return Math.floor(variantPosition / binWidth)
  }

  variants.forEach(variant => {
    const category = variantCategory(variant)
    const binIndex = variantBinIndex(variant)
    if (binIndex >= 0 && binIndex < bins.length) {
      bins[binIndex][category] += 1
    }
  })

  const maxVariantsInBin = bins.reduce((max, bin) => {
    const binTotal = Object.values(bin).reduce((a, b) => a + b, 0)
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
              {variantCategories.map(category => {
                const barHeight = y(bin[category])
                const bar = (
                  <rect
                    key={category}
                    x={0}
                    y={height - yOffset - barHeight}
                    width={binWidth - binPadding * 2}
                    height={barHeight}
                    fill={categoryColor(category)}
                  />
                )
                yOffset += barHeight
                return bar
              })}
            </g>
          )
        })}
      </g>
      <line x1={0} y1={height} x2={width} y2={height} stroke="#000" />
    </svg>
  )
}

BinnedVariantsPlot.propTypes = {
  categoryColor: PropTypes.func,
  height: PropTypes.number,
  scalePosition: PropTypes.func.isRequired,
  variantCategory: PropTypes.func,
  variantCategories: PropTypes.arrayOf(PropTypes.string),
  variants: PropTypes.arrayOf(PropTypes.object).isRequired,
  width: PropTypes.number.isRequired,
}

BinnedVariantsPlot.defaultProps = {
  categoryColor: () => '#424242',
  height: 50,
  variantCategory: () => 'undefined',
  variantCategories: ['undefined'],
}

export default BinnedVariantsPlot
