import { scaleLinear } from 'd3-scale'
import PropTypes from 'prop-types'
import React, { useState } from 'react'
import styled from 'styled-components'

import { Track } from '@gnomad/region-viewer'
import { Checkbox, SegmentedControl } from '@gnomad/ui'

import { getCategoryFromConsequence, getLabelForConsequenceTerm } from '../vepConsequences'
import StackedVariantsPlot from './StackedVariantsPlot'

const CONSEQUENCE_COLORS = {
  lof: '#dd2c00',
  missense: 'orange',
  synonymous: '#2e7d32',
}

const DEFAULT_COLOR = '#424242'

const clinvarVariantColor = clinvarVariant => {
  if (!clinvarVariant.major_consequence) {
    return DEFAULT_COLOR
  }
  const category = getCategoryFromConsequence(clinvarVariant.major_consequence)
  return CONSEQUENCE_COLORS[category] || DEFAULT_COLOR
}

const ClinvarVariantPropType = PropTypes.shape({
  clinical_significance: PropTypes.string.isRequired,
  clinvar_variation_id: PropTypes.string.isRequired,
  gold_stars: PropTypes.number.isRequired,
  major_consequence: PropTypes.string,
  pos: PropTypes.number.isRequired,
  variant_id: PropTypes.string.isRequired,
})

// ================================================================
// Binned variants plot
// ================================================================

const ClinvarBinnedVariantsPlot = ({ scalePosition, variants, width }) => {
  const height = 30
  const nBins = Math.min(100, Math.floor(width / 8))
  const binWidth = width / nBins
  const binPadding = 1
  const bins = [...Array(nBins)].map(() => ({ lof: 0, missense: 0, synonymous: 0, other: 0 }))

  const variantBinIndex = variant => {
    const variantPosition = scalePosition(variant.pos)
    return Math.floor(variantPosition / binWidth)
  }

  variants.forEach(variant => {
    const category = variant.major_consequence
      ? getCategoryFromConsequence(variant.major_consequence)
      : 'other'

    const binIndex = variantBinIndex(variant)
    if (binIndex >= 0 && binIndex < bins.length) {
      bins[binIndex][category] += 1
    }
  })

  const categories = ['lof', 'missense', 'synonymous', 'other']

  const maxVariantsInBin = bins.reduce((max, bin) => {
    const binTotal = bin.lof + bin.missense + bin.synonymous + bin.other
    return Math.max(max, binTotal)
  }, 1)

  const y = scaleLinear().domain([0, maxVariantsInBin]).range([0, height])

  return (
    <svg height={height} width={width} style={{ overflow: 'visible' }}>
      <g>
        <text x={-7} y={0} dy="0.3em" textAnchor="end">
          {maxVariantsInBin}
        </text>
        <line x1={-5} y1={0} x2={0} y2={0} stroke="black" strokeWidth={1} />

        <text x={-7} y={height} dy="0.3em" textAnchor="end">
          0
        </text>

        <line x1={-5} y1={height} x2={0} y2={height} stroke="black" strokeWidth={1} />
      </g>
      <g>
        {bins.map((bin, binIndex) => {
          let yOffset = 0
          return (
            // eslint-disable-next-line react/no-array-index-key
            <g key={binIndex} transform={`translate(${binIndex * binWidth + binPadding},0)`}>
              {categories.map(category => {
                const barHeight = y(bin[category])
                const bar = (
                  <rect
                    key={category}
                    x={0}
                    y={height - yOffset - barHeight}
                    width={binWidth - binPadding * 2}
                    height={barHeight}
                    fill={CONSEQUENCE_COLORS[category] || DEFAULT_COLOR}
                  />
                )
                yOffset += barHeight
                return bar
              })}
            </g>
          )
        })}
      </g>
      <line x1={0} y1={height} x2={width} y2={height} stroke="#424242" />
    </svg>
  )
}

ClinvarBinnedVariantsPlot.propTypes = {
  scalePosition: PropTypes.func.isRequired,
  variants: PropTypes.arrayOf(ClinvarVariantPropType).isRequired,
  width: PropTypes.number.isRequired,
}

// ================================================================
// Stacked variants plot
// ================================================================

const ClinvarVariantAttributeList = styled.dl`
  margin: 0.5em 0;

  div {
    margin-bottom: 0.25em;
  }

  dt,
  dd {
    display: inline;
  }

  dt {
    font-weight: bold;
  }

  dd {
    margin: 0 0 0 0.5em;
  }
`

const ClinvarTooltip = ({ variant }) => (
  <div>
    <strong>{variant.variant_id}</strong>
    <ClinvarVariantAttributeList>
      <div>
        <dt>Clinical Signficance</dt>
        <dd>{variant.clinical_significance}</dd>
      </div>
      <div>
        <dt>Consequence</dt>
        <dd>{getLabelForConsequenceTerm(variant.major_consequence)}</dd>
      </div>
      <div>
        <dt>Gold stars</dt>
        <dd>{variant.gold_stars}</dd>
      </div>
    </ClinvarVariantAttributeList>
    Click to view in ClinVar
  </div>
)

ClinvarTooltip.propTypes = {
  variant: ClinvarVariantPropType.isRequired,
}

const onClickVariant = variant => {
  const clinVarWindow = window.open()
  // https://www.jitbit.com/alexblog/256-targetblank---the-most-underestimated-vulnerability-ever/
  clinVarWindow.opener = null
  clinVarWindow.location = `https://www.ncbi.nlm.nih.gov/clinvar/variation/${variant.clinvar_variation_id}/`
}

const ClinvarStackedVariantsPlot = ({ scalePosition, variants, width }) => {
  const variantsByConsequence = {
    lof: [],
    missense: [],
    synonymous: [],
    other: [],
  }

  variants.forEach(variant => {
    const category = variant.major_consequence
      ? getCategoryFromConsequence(variant.major_consequence)
      : 'other'

    variantsByConsequence[category].push(variant)
  })

  const layers = [
    variantsByConsequence.lof,
    variantsByConsequence.missense,
    variantsByConsequence.synonymous,
    variantsByConsequence.other,
  ]

  return (
    <StackedVariantsPlot
      onClickVariant={onClickVariant}
      scalePosition={scalePosition}
      symbolColor={clinvarVariantColor}
      tooltipComponent={ClinvarTooltip}
      variantLayers={layers}
      width={width}
    />
  )
}

ClinvarStackedVariantsPlot.propTypes = {
  scalePosition: PropTypes.func.isRequired,
  variants: PropTypes.arrayOf(ClinvarVariantPropType).isRequired,
  width: PropTypes.number.isRequired,
}

// ================================================================
// Track
// ================================================================

const Wrapper = styled.div`
  margin-bottom: 1em;
`

const TopPanel = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
`

const PlotWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  padding-top: 10px;
`

const TitlePanel = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  padding-right: 20px;
`

const ClinvarVariantTrack = ({ selectedGnomadVariants, variants, variantFilter }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isFilteredtoGnomad, setIsFilteredtoGnomad] = useState(false)

  const isCategoryIncluded = {
    lof: variantFilter.includeCategories.lof,
    missense: variantFilter.includeCategories.missense,
    synonymous: variantFilter.includeCategories.synonymous,
    other: variantFilter.includeCategories.other,
  }
  const matchesConsequenceFilter = variant => {
    const category = getCategoryFromConsequence(variant.major_consequence) || 'other'
    return isCategoryIncluded[category]
  }

  let filteredVariants = variants.filter(matchesConsequenceFilter)

  filteredVariants = filteredVariants.filter(v => {
    const [chrom, pos, ref, alt] = v.variant_id.split('-') // eslint-disable-line no-unused-vars

    const isSNV = ref.length === 1 && alt.length === 1
    const isIndel = ref.length !== alt.length

    return (variantFilter.includeSNVs && isSNV) || (variantFilter.includeIndels && isIndel)
  })

  if (isFilteredtoGnomad) {
    const gnomadVariantSet = new Set(selectedGnomadVariants.map(v => v.variant_id))
    filteredVariants = filteredVariants.filter(v => gnomadVariantSet.has(v.variant_id))
  }

  return (
    <Wrapper>
      <Track
        renderLeftPanel={() => (
          <TitlePanel>ClinVar variants ({filteredVariants.length})</TitlePanel>
        )}
        renderTopPanel={() => (
          <TopPanel>
            <Checkbox
              checked={isFilteredtoGnomad}
              id="clinvar-track-filter-to-gnomad"
              label="Filter to selected gnomAD variants"
              style={{ marginRight: '1em' }}
              onChange={setIsFilteredtoGnomad}
            />
            <SegmentedControl
              id="clinvar-track-mode"
              options={[
                { label: 'Bins', value: false },
                { label: 'All variants', value: true },
              ]}
              value={isExpanded}
              onChange={setIsExpanded}
            />
          </TopPanel>
        )}
      >
        {({ scalePosition, width }) => {
          const PlotComponent = isExpanded ? ClinvarStackedVariantsPlot : ClinvarBinnedVariantsPlot

          return (
            <PlotWrapper>
              <PlotComponent
                scalePosition={scalePosition}
                variants={filteredVariants}
                width={width}
              />
            </PlotWrapper>
          )
        }}
      </Track>
    </Wrapper>
  )
}

ClinvarVariantTrack.propTypes = {
  selectedGnomadVariants: PropTypes.arrayOf(
    PropTypes.shape({
      variant_id: PropTypes.string.isRequired,
    })
  ).isRequired,
  variants: PropTypes.arrayOf(ClinvarVariantPropType).isRequired,
  variantFilter: PropTypes.shape({
    includeCategories: PropTypes.shape({
      lof: PropTypes.bool.isRequired,
      missense: PropTypes.bool.isRequired,
      synonymous: PropTypes.bool.isRequired,
      other: PropTypes.bool.isRequired,
    }).isRequired,
    includeSNVs: PropTypes.bool.isRequired,
    includeIndels: PropTypes.bool.isRequired,
  }).isRequired,
}

export default React.memo(ClinvarVariantTrack)
