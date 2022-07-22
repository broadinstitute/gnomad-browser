import { symbol, symbolCircle, symbolCross, symbolDiamond, symbolTriangle } from 'd3-shape'
import { debounce } from 'lodash-es'
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
const getFrameshiftTerminationSitePosition = (variant: any, transcript: any) => {
  const match = /^p\.[a-z]{3}(\d+)[a-z]{3,}?fsTer(\d+|\?)$/i.exec(variant.hgvsp)

  // If HGVSp annotation does not match a frameshift, draw the termination site at the variant's position
  if (!match) {
    return variant.pos
  }

  // Codon of the first amino acid changed
  const position = Number(match[1])
  // Codon within the new reading frame of the termination site
  const terminationSitePosition = match[2]

  const exons = transcript.exons.sort((e1: any, e2: any) => e1.start - e2.start)

  // Codon numbers in HGVSp notation start from the 5' end for the + strand and the 3' end for the - strand.
  if (transcript.strand === '-') {
    exons.reverse()
  }

  // Codon positions extracted from HGVS notation start at the CDS region and may extend into the downstream UTR
  const codingAndDownstreamExons = exons.slice(
    exons.findIndex((e: any) => e.feature_type === 'CDS')
  )

  // Termination site position may be "?" if the new reading frame does not encounter a stop codon
  // In this case, place the termination site at the end of the transcript
  if (terminationSitePosition === '?') {
    return transcript.strand === '-'
      ? codingAndDownstreamExons[0].start
      : codingAndDownstreamExons[codingAndDownstreamExons.length - 1].stop
  }

  // Offset in bases from the start of the transcript's CDS region to the termination site
  // Codon numbers are 1 indexed
  const baseOffset = (position - 1 + Number(terminationSitePosition) - 1) * 3

  let remainingOffset = baseOffset
  // Termination site should always fall within an exon
  const exonContainingTerminationSite = codingAndDownstreamExons.find((e: any) => {
    const exonSize = e.stop - e.start + 1
    if (remainingOffset < exonSize) {
      return true
    }
    remainingOffset -= exonSize
    return false
  })

  return transcript.strand === '-'
    ? exonContainingTerminationSite.stop - remainingOffset
    : exonContainingTerminationSite.start + remainingOffset
}

type ClinvarAllVariantsPlotProps = {
  scalePosition: (...args: any[]) => any
  transcripts: {
    transcript_id: string
    exons: {
      feature_type: string
      start: number
      stop: number
    }[]
  }[]
  variants: ClinvarVariantPropType[]
  width: number
  onClickVariant: (...args: any[]) => any
}

const ClinvarAllVariantsPlot = ({
  scalePosition,
  transcripts,
  variants,
  width,
  onClickVariant,
}: ClinvarAllVariantsPlotProps) => {
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

  variants.forEach((variant) => {
    const category = clinvarVariantClinicalSignificanceCategory(variant)
    // @ts-expect-error TS(2322) FIXME: Type 'string' is not assignable to type 'never'.
    variantsByCategory[category].push({ ...variant, category })
  })

  const layers = [
    variantsByCategory.pathogenic,
    variantsByCategory.uncertain,
    variantsByCategory.benign,
    variantsByCategory.other,
  ]

  const rows: any = []
  const pointSpacing = 9
  const rowHeight = 10
  layers.forEach((variantsInLayer) => {
    variantsInLayer.forEach((variant) => {
      let xStart: any
      let xEnd: any

      if ((variant as any).major_consequence === 'frameshift_variant') {
        // For transcripts on the negative strand, the termination site will be at a lower global position
        // than the variant's position.
        const pos1 = scalePosition((variant as any).pos)
        const pos2 = scalePosition(
          getFrameshiftTerminationSitePosition(
            variant,
            transcripts.find((t: any) => t.transcript_id === (variant as any).transcript_id)
          )
        )
        xStart = Math.min(pos1, pos2)
        xEnd = Math.max(pos1, pos2)
      } else {
        xStart = scalePosition((variant as any).pos)
        xEnd = xStart
      }

      let rowIndex = rows.findIndex(
        (rowPoints: any) =>
          !rowPoints.some(
            (p: any) => xStart < p.xEnd + pointSpacing && xEnd >= p.xStart - pointSpacing
          )
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

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const symbolColor = (variant: any) => CLINICAL_SIGNIFICANCE_CATEGORY_COLORS[variant.category]

  const circle = useMemo(() => symbol().size(32).type(symbolCircle)(), [])
  const cross = useMemo(() => symbol().size(40).type(symbolCross)(), [])
  const diamond = useMemo(() => symbol().size(32).type(symbolDiamond)(), [])
  const triangle = useMemo(() => symbol().size(32).type(symbolTriangle)(), [])

  /**
   * Render symbol based on variant's consequence
   * - LoF / essential splice site: square
   * - Frameshift: triangle dash square
   * - Missense / in-frame indel: triangle
   * - Non-essential splice region: diamond
   * - Synonymous / non-coding: circle
   * - Other: star
   */
  const renderMarker = (point: any) => {
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
      const transcript = transcripts.find((t: any) => t.transcript_id === variant.transcript_id)
      const terminationSitePosition = getFrameshiftTerminationSitePosition(variant, transcript)
      const frameshiftMinPos = Math.min(variant.pos, terminationSitePosition)
      const frameshiftMaxPos = Math.max(variant.pos, terminationSitePosition)
      // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
      const frameshiftExonRegions = transcript.exons
        .sort((e1: any, e2: any) => e1.start - e2.start)
        .filter((e: any) => e.start <= frameshiftMaxPos && e.stop >= frameshiftMinPos)
        .map((e: any) => ({
          start: Math.max(e.start, frameshiftMinPos),
          stop: Math.min(e.stop, frameshiftMaxPos),
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
          {frameshiftExonRegions.map((r: any, i: any, regions: any) => {
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
            // @ts-expect-error TS(2322) FIXME: Type 'string | null' is not assignable to type 'st... Remove this comment to see the full error message
            d={cross}
            fill={fill}
            stroke="#666"
            strokeWidth={0.5}
            transform={`translate(${scalePosition(terminationSitePosition)},${
              plotHeight - point.y
            }) rotate(45)`}
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
        // @ts-expect-error TS(2322) FIXME: Type 'string | null' is not assignable to type 'st... Remove this comment to see the full error message
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
          // @ts-expect-error TS(2345) FIXME: Argument of type '"frameshift"' is not assignable ... Remove this comment to see the full error message
          onMouseEnter={() => setHighlightedCategory('frameshift')}
          onMouseLeave={() => setHighlightedCategory(null)}
        >
          <line x1={0} y1={0} x2={10} y2={0} stroke="#333" strokeWidth={0.5} />
          {/* @ts-expect-error TS(2322) FIXME: Type 'string | null' is not assignable to type 'st... Remove this comment to see the full error message */}
          <path d={cross} fill="#333" stroke="none" transform="translate(10,0) rotate(45)" />
          <text dy="0.3em" fontSize={12} x={16}>
            Frameshift
          </text>
        </g>
        <g
          transform="translate(86,0)"
          // @ts-expect-error TS(2345) FIXME: Argument of type '"other_lof"' is not assignable t... Remove this comment to see the full error message
          onMouseEnter={() => setHighlightedCategory('other_lof')}
          onMouseLeave={() => setHighlightedCategory(null)}
        >
          {/* @ts-expect-error TS(2322) FIXME: Type 'string | null' is not assignable to type 'st... Remove this comment to see the full error message */}
          <path d={cross} fill="#333" stroke="none" transform="rotate(45)" />
          <text dy="0.3em" fontSize={12} x={6}>
            Other pLoF
          </text>
        </g>
        <g
          transform="translate(165,0)"
          // @ts-expect-error TS(2345) FIXME: Argument of type '"missense"' is not assignable to... Remove this comment to see the full error message
          onMouseEnter={() => setHighlightedCategory('missense')}
          onMouseLeave={() => setHighlightedCategory(null)}
        >
          {/* @ts-expect-error TS(2322) FIXME: Type 'string | null' is not assignable to type 'st... Remove this comment to see the full error message */}
          <path d={triangle} fill="#333" stroke="none" />
          <text dy="0.3em" fontSize={12} x={6}>
            Missense / Inframe indel
          </text>
        </g>
        <g
          transform="translate(318,0)"
          // @ts-expect-error TS(2345) FIXME: Argument of type '"splice_region"' is not assignab... Remove this comment to see the full error message
          onMouseEnter={() => setHighlightedCategory('splice_region')}
          onMouseLeave={() => setHighlightedCategory(null)}
        >
          {/* @ts-expect-error TS(2322) FIXME: Type 'string | null' is not assignable to type 'st... Remove this comment to see the full error message */}
          <path d={diamond} fill="#333" stroke="none" />
          <text dy="0.3em" fontSize={12} x={6}>
            Splice region
          </text>
        </g>
        <g
          transform="translate(406,0)"
          // @ts-expect-error TS(2345) FIXME: Argument of type '"other"' is not assignable to pa... Remove this comment to see the full error message
          onMouseEnter={() => setHighlightedCategory('other')}
          onMouseLeave={() => setHighlightedCategory(null)}
        >
          {/* @ts-expect-error TS(2322) FIXME: Type 'string | null' is not assignable to type 'st... Remove this comment to see the full error message */}
          <path d={circle} fill="#333" stroke="none" />
          <text dy="0.3em" fontSize={12} x={7}>
            Synonymous / non-coding
          </text>
        </g>
      </g>
      <g transform="translate(0, 25)">
        {/* @ts-expect-error TS(7006) FIXME: Parameter 'points' implicitly has an 'any' type. */}
        {rows.map((points, rowIndex) => (
          // eslint-disable-next-line react/no-array-index-key
          <React.Fragment key={rowIndex}>
            {points.map((point: any) => (
              <TooltipAnchor
                key={point.variant.variant_id}
                tooltipComponent={ClinvarVariantTooltip}
                // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; key: any; tooltipCompon... Remove this comment to see the full error message
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

export default ClinvarAllVariantsPlot
