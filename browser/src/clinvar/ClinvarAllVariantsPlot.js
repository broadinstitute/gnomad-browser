import { symbol, symbolCircle, symbolCross, symbolDiamond, symbolTriangle } from 'd3-shape'
import debounce from 'lodash.debounce'
import PropTypes from 'prop-types'
import React, { useCallback, useMemo, useState } from 'react'

import { TooltipAnchor } from '@gnomad/ui'

import {
  CLINICAL_SIGNIFICANCE_CATEGORY_COLORS,
  clinvarVariantClinicalSignificanceCategory,
  clinvarVariantConsequenceCategory,
} from './clinvarVariantCategories'
import ClinvarVariantPropType from './ClinvarVariantPropType'
import ClinvarVariantTooltip from './ClinvarVariantTooltip'

const ClinvarAllVariantsPlot = ({ scalePosition, variants, width }) => {
  const [highlightedCategory, _setHighlightedCategory] = useState(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setHighlightedCategory = useCallback(debounce(_setHighlightedCategory, 150), [
    _setHighlightedCategory,
  ])

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

  const rows = []
  const pointSpacing = 9
  const rowHeight = 10
  layers.forEach(variantsInLayer => {
    variantsInLayer.forEach(variant => {
      const xStart = scalePosition(variant.pos)
      const xEnd =
        variant.major_consequence === 'frameshift_variant' && variant.hgvsp
          ? scalePosition(
              variant.pos + Number(variant.hgvsp.slice(variant.hgvsp.indexOf('Ter') + 3))
            )
          : xStart

      let rowIndex = rows.findIndex(
        rowPoints =>
          !rowPoints.some(p => xStart < p.xEnd + pointSpacing && xEnd >= p.xStart - pointSpacing)
      )

      if (rowIndex === -1) {
        rows.push([])
        rowIndex = rows.length - 1
      }

      rows[rowIndex].push({
        variant,
        xStart,
        xEnd,
        y: rowHeight * (rowIndex + 0.5),
      })
    })
  })

  const plotHeight = rows.length * rowHeight

  const symbolColor = variant => CLINICAL_SIGNIFICANCE_CATEGORY_COLORS[variant.category]

  const circle = useMemo(() => symbol().size(32).type(symbolCircle)(), [])
  const cross = useMemo(() => symbol().size(40).type(symbolCross)(), [])
  const diamond = useMemo(() => symbol().size(32).type(symbolDiamond)(), [])
  const triangle = useMemo(() => symbol().size(32).type(symbolTriangle)(), [])

  const onClickVariant = variant => {
    const clinVarWindow = window.open()
    // https://www.jitbit.com/alexblog/256-targetblank---the-most-underestimated-vulnerability-ever/
    clinVarWindow.opener = null
    clinVarWindow.location = `https://www.ncbi.nlm.nih.gov/clinvar/variation/${variant.clinvar_variation_id}/`
  }

  /**
   * Render symbol based on variant's consequence
   * - LoF / essential splice site: square
   * - Frameshift: triangle dash square
   * - Missense / in-frame indel: triangle
   * - Non-essential splice region: diamond
   * - Synonymous / non-coding: circle
   * - Other: star
   */
  const renderMarker = point => {
    const { variant } = point
    const category = clinvarVariantConsequenceCategory(variant)
    const fill = symbolColor(variant)
    let opacity = 1
    if (
      highlightedCategory &&
      !(
        highlightedCategory === category ||
        (category === 'synonymous' && highlightedCategory === 'other')
      )
    ) {
      opacity = 0.2
    }

    if (category === 'frameshift') {
      return (
        <g onClick={() => onClickVariant(variant)}>
          <rect
            x={point.xStart}
            y={plotHeight - point.y - 5}
            width={point.xEnd - point.xStart}
            height={10}
            // transparent instead of none is necessary for tooltip hover
            fill="transparent"
            opacity={opacity}
          />
          <line
            x1={point.xStart}
            y1={plotHeight - point.y}
            x2={point.xEnd}
            y2={plotHeight - point.y}
            stroke="#333"
            strokeWidth={0.5}
            opacity={opacity}
          />
          <path
            d={cross}
            fill={fill}
            stroke="#666"
            strokeWidth={0.5}
            transform={`translate(${point.xEnd},${plotHeight - point.y}) rotate(45)`}
            opacity={opacity}
          />
        </g>
      )
    }

    let symbolPath = circle
    let symbolRotation = 0
    let symbolOffset = 0
    if (category === 'other_lof') {
      symbolPath = cross
      symbolRotation = 45
    } else if (category === 'missense') {
      symbolPath = triangle
      symbolOffset = 1
    } else if (category === 'splice_region') {
      symbolPath = diamond
    }
    return (
      <path
        d={symbolPath}
        transform={`translate(${point.xStart},${
          plotHeight - point.y + symbolOffset
        }) rotate(${symbolRotation})`}
        fill={fill}
        stroke="#666"
        strokeWidth={0.5}
        opacity={opacity}
        onClick={() => onClickVariant(variant)}
      />
    )
  }

  return (
    <svg height={plotHeight + 25} width={width}>
      <g transform="translate(0, 9)">
        <g
          onMouseEnter={() => setHighlightedCategory('frameshift')}
          onMouseLeave={() => setHighlightedCategory(null)}
        >
          <line x1={0} y1={0} x2={10} y2={0} stroke="#333" strokeWidth={0.5} />
          <path d={cross} fill="#333" stroke="none" transform="translate(10,0) rotate(45)" />
          <text dy="0.3em" fontSize={12} x={16}>
            Frameshift
          </text>
        </g>
        <g
          transform="translate(86,0)"
          onMouseEnter={() => setHighlightedCategory('other_lof')}
          onMouseLeave={() => setHighlightedCategory(null)}
        >
          <path d={cross} fill="#333" stroke="none" transform="rotate(45)" />
          <text dy="0.3em" fontSize={12} x={6}>
            Other pLoF
          </text>
        </g>
        <g
          transform="translate(165,0)"
          onMouseEnter={() => setHighlightedCategory('missense')}
          onMouseLeave={() => setHighlightedCategory(null)}
        >
          <path d={triangle} fill="#333" stroke="none" />
          <text dy="0.3em" fontSize={12} x={6}>
            Missense / Inframe indel
          </text>
        </g>
        <g
          transform="translate(318,0)"
          onMouseEnter={() => setHighlightedCategory('splice_region')}
          onMouseLeave={() => setHighlightedCategory(null)}
        >
          <path d={diamond} fill="#333" stroke="none" />
          <text dy="0.3em" fontSize={12} x={6}>
            Splice region
          </text>
        </g>
        <g
          transform="translate(406,0)"
          onMouseEnter={() => setHighlightedCategory('other')}
          onMouseLeave={() => setHighlightedCategory(null)}
        >
          <path d={circle} fill="#333" stroke="none" />
          <text dy="0.3em" fontSize={12} x={7}>
            Synonymous / non-coding
          </text>
        </g>
      </g>
      <g transform="translate(0, 25)">
        {rows.map((points, rowIndex) => (
          // eslint-disable-next-line react/no-array-index-key
          <React.Fragment key={rowIndex}>
            {points.map(point => (
              <TooltipAnchor
                key={point.variant.variant_id}
                tooltipComponent={ClinvarVariantTooltip}
                variant={point.variant}
              >
                {renderMarker(point)}
              </TooltipAnchor>
            ))}
          </React.Fragment>
        ))}
      </g>
      <line x1={0} y1={plotHeight + 25} x2={width} y2={plotHeight + 25} stroke="#424242" />
    </svg>
  )
}

ClinvarAllVariantsPlot.propTypes = {
  scalePosition: PropTypes.func.isRequired,
  variants: PropTypes.arrayOf(ClinvarVariantPropType).isRequired,
  width: PropTypes.number.isRequired,
}

export default ClinvarAllVariantsPlot
