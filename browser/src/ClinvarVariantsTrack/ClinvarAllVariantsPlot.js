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

// For a description of HGVS frameshift notation, see
// https://varnomen.hgvs.org/recommendations/protein/variant/frameshift/
const getFrameshiftTerminationSitePosition = (variant, transcript) => {
  const match = /^p\.[a-z]{3}(\d+)[a-z]{3,}?fsTer(\d+|\?)$/i.exec(variant.hgvsp)

  // If HGVSp annotation does not match a frameshift, draw the termination site at the variant's position
  if (!match) {
    return variant.pos
  }

  // Codon of the first amino acid changed
  const position = Number(match[1])
  // Codon within the new reading frame of the termination site
  const terminationSitePosition = match[2]

  const exons = transcript.exons.sort((e1, e2) => e1.start - e2.start)

  // Codon positions extracted from HGVS notation start at the CDS region and may extend into the 3' UTR
  const codingAndDownstreamExons = exons.slice(exons.findIndex(e => e.feature_type === 'CDS'))

  // Termination site position may be "?" if the new reading frame does not encounter a stop codon
  // In this case, place the termination site at the end of the transcript
  if (terminationSitePosition === '?') {
    return codingAndDownstreamExons[codingAndDownstreamExons.length - 1].stop
  }

  // Offset in bases from the start of the transcript's CDS region to the termination site
  // Codon numbers are 1 indexed
  const baseOffset = (position - 1 + Number(terminationSitePosition) - 1) * 3

  let remainingOffset = baseOffset
  // Termination site should always fall within an exon
  const exonContainingTerminationSite = codingAndDownstreamExons.find(e => {
    const exonSize = e.stop - e.start + 1
    if (remainingOffset < exonSize) {
      return true
    }
    remainingOffset -= exonSize
    return false
  })

  return exonContainingTerminationSite.start + remainingOffset
}

const ClinvarAllVariantsPlot = ({ scalePosition, transcripts, variants, width }) => {
  window.transcripts = transcripts

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
              getFrameshiftTerminationSitePosition(
                variant,
                transcripts.find(t => t.transcript_id === variant.transcript_id)
              )
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
      const transcript = transcripts.find(t => t.transcript_id === variant.transcript_id)
      const terminationSitePosition = getFrameshiftTerminationSitePosition(variant, transcript)
      const frameshiftExonRegions = transcript.exons
        .sort((e1, e2) => e1.start - e2.start)
        .filter(e => e.start <= terminationSitePosition && e.stop >= variant.pos)
        .map(e => ({
          start: Math.max(e.start, variant.pos),
          stop: Math.min(e.stop, terminationSitePosition),
        }))

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
            style={{ cursor: 'pointer' }}
          />
          {frameshiftExonRegions.map((r, i, regions) => {
            const lineY = plotHeight - point.y
            return (
              <React.Fragment key={`${r.start}-${r.stop}`}>
                {i !== 0 && (
                  <line
                    x1={scalePosition(regions[i - 1].stop)}
                    y1={lineY}
                    x2={scalePosition(r.start)}
                    y2={lineY}
                    stroke="#333"
                    strokeDasharray="2 5"
                    strokeWidth={0.5}
                    opacity={opacity}
                    style={{ cursor: 'pointer' }}
                  />
                )}
                <line
                  x1={scalePosition(r.start)}
                  y1={lineY}
                  x2={scalePosition(r.stop)}
                  y2={lineY}
                  stroke="#333"
                  strokeWidth={0.5}
                  opacity={opacity}
                  style={{ cursor: 'pointer' }}
                />
              </React.Fragment>
            )
          })}
          <path
            d={cross}
            fill={fill}
            stroke="#666"
            strokeWidth={0.5}
            transform={`translate(${point.xEnd},${plotHeight - point.y}) rotate(45)`}
            opacity={opacity}
            style={{ cursor: 'pointer' }}
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
        style={{ cursor: 'pointer' }}
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
  transcripts: PropTypes.arrayOf(
    PropTypes.shape({
      transcript_id: PropTypes.string.isRequired,
      exons: PropTypes.arrayOf(
        PropTypes.shape({
          feature_type: PropTypes.string.isRequired,
          start: PropTypes.number.isRequired,
          stop: PropTypes.number.isRequired,
        })
      ).isRequired,
    })
  ).isRequired,
  variants: PropTypes.arrayOf(ClinvarVariantPropType).isRequired,
  width: PropTypes.number.isRequired,
}

export default ClinvarAllVariantsPlot
