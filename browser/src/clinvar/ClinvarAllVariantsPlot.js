import { symbol, symbolStar } from 'd3-shape'
import PropTypes from 'prop-types'
import React from 'react'

import { TooltipAnchor } from '@gnomad/ui'

import {
  CLINICAL_SIGNIFICANCE_CATEGORY_COLORS,
  clinvarVariantClinicalSignificanceCategory,
} from './clinvarVariantCategories'
import ClinvarVariantPropType from './ClinvarVariantPropType'
import ClinvarVariantTooltip from './ClinvarVariantTooltip'

const layoutStackedPoints = (dataLayers, scale, spacing) => {
  const rows = []

  dataLayers.forEach(layerPoints => {
    layerPoints.forEach(dataPoint => {
      const pointPosition = scale(dataPoint)

      let rowIndex = rows.findIndex(rowPoints =>
        rowPoints.every(point => Math.abs(point.x - pointPosition) >= spacing)
      )

      if (rowIndex === -1) {
        rows.push([])
        rowIndex = rows.length - 1
      }

      rows[rowIndex].push({
        data: dataPoint,
        x: pointPosition,
        y: spacing * (rowIndex + 0.5),
      })
    })
  })

  return {
    height: rows.length * spacing,
    points: rows.reduce((acc, row) => acc.concat(row), []),
  }
}

const ClinvarAllVariantsPlot = ({ scalePosition, variants, width }) => {
  const variantsByCategory = {
    pathogenic: [],
    uncertain: [],
    benign: [],
    other: [],
  }

  variants.forEach(variant => {
    const category = clinvarVariantClinicalSignificanceCategory(variant)
    variantsByCategory[category].push({ ...variant, category })
  })

  const layers = [
    variantsByCategory.pathogenic,
    variantsByCategory.uncertain,
    variantsByCategory.benign,
    variantsByCategory.other,
  ]

  const x = variant => scalePosition(variant.pos)
  const { points, height } = layoutStackedPoints(layers, x, 6)

  const symbolColor = variant => CLINICAL_SIGNIFICANCE_CATEGORY_COLORS[variant.category]

  const symbolPath = symbol().size(12).type(symbolStar)()

  const onClickVariant = variant => {
    const clinVarWindow = window.open()
    // https://www.jitbit.com/alexblog/256-targetblank---the-most-underestimated-vulnerability-ever/
    clinVarWindow.opener = null
    clinVarWindow.location = `https://www.ncbi.nlm.nih.gov/clinvar/variation/${variant.clinvar_variation_id}/`
  }

  return (
    <svg height={height} width={width}>
      <g>
        {points.map(point => (
          <TooltipAnchor
            key={point.data.variant_id}
            tooltipComponent={ClinvarVariantTooltip}
            variant={point.data}
          >
            <path
              d={symbolPath}
              transform={`translate(${point.x},${height - point.y})`}
              fill={symbolColor(point.data)}
              stroke="none"
              onClick={() => onClickVariant(point.data)}
            />
          </TooltipAnchor>
        ))}
      </g>
      <line x1={0} y1={height} x2={width} y2={height} stroke="#424242" />
    </svg>
  )
}

ClinvarAllVariantsPlot.propTypes = {
  scalePosition: PropTypes.func.isRequired,
  variants: PropTypes.arrayOf(ClinvarVariantPropType).isRequired,
  width: PropTypes.number.isRequired,
}

export default ClinvarAllVariantsPlot
