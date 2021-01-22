import PropTypes from 'prop-types'
import React, { useState } from 'react'
import styled from 'styled-components'

import { Track } from '@gnomad/region-viewer'
import { Button, CategoryFilterControl } from '@gnomad/ui'

import BinnedVariantsPlot from '../BinnedVariantsPlot'
import { getLabelForConsequenceTerm } from '../vepConsequences'
import StackedVariantsPlot from './StackedVariantsPlot'

const ClinvarVariantPropType = PropTypes.shape({
  clinical_significance: PropTypes.string.isRequired,
  clinvar_variation_id: PropTypes.string.isRequired,
  gold_stars: PropTypes.number.isRequired,
  hgvsc: PropTypes.string,
  hgvsp: PropTypes.string,
  major_consequence: PropTypes.string,
  pos: PropTypes.number.isRequired,
  review_status: PropTypes.string.isRequired,
  variant_id: PropTypes.string.isRequired,
})

const CLINICAL_SIGNIFICANCE_CATEGORY_COLORS = {
  pathogenic: '#E6573D',
  uncertain: '#FAB470',
  benign: '#5E6F9E',
  other: '#bababa',
}

const CLINICAL_SIGNIFICANCE_GROUPS = {
  pathogenic: new Set([
    'Pathogenic',
    'Likely pathogenic',
    'Pathogenic/Likely pathogenic',
    'association',
    'risk factor',
  ]),
  uncertain: new Set([
    'Uncertain significance',
    'Conflicting interpretations of pathogenicity',
    'conflicting data from submitters',
  ]),
  benign: new Set(['Benign', 'Likely benign', 'Benign/Likely benign']),
  other: new Set([
    'other',
    'drug response',
    'Affects',
    'protective',
    'no interpretation for the single variant',
    'not provided',
    'association not found',
  ]),
}

const clinvarVariantClinicalSignificanceCategory = variant => {
  const clinicalSignificances = variant.clinical_significance.split(', ')

  if (clinicalSignificances.some(s => CLINICAL_SIGNIFICANCE_GROUPS.pathogenic.has(s))) {
    return 'pathogenic'
  }
  if (clinicalSignificances.some(s => CLINICAL_SIGNIFICANCE_GROUPS.uncertain.has(s))) {
    return 'uncertain'
  }
  if (clinicalSignificances.some(s => CLINICAL_SIGNIFICANCE_GROUPS.benign.has(s))) {
    return 'benign'
  }
  return 'other'
}

// ================================================================
// Binned variants plot
// ================================================================

const ClinvarBinnedVariantsPlot = props => {
  return (
    <BinnedVariantsPlot
      {...props}
      categoryColor={category => CLINICAL_SIGNIFICANCE_CATEGORY_COLORS[category]}
      variantCategory={clinvarVariantClinicalSignificanceCategory}
      variantCategories={['pathogenic', 'uncertain', 'benign', 'other']}
    />
  )
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
        <dt>Clinical significance</dt>
        <dd>{variant.clinical_significance}</dd>
      </div>
      <div>
        <dt>HGVS consequence</dt>
        <dd>{variant.hgvsp || variant.hgvsc || '–'}</dd>
      </div>
      <div>
        <dt>VEP annotation</dt>
        <dd>{getLabelForConsequenceTerm(variant.major_consequence)}</dd>
      </div>
      <div>
        <dt>Review status</dt>
        <dd>
          {variant.review_status} ({variant.gold_stars}{' '}
          {variant.gold_stars === 1 ? 'star' : 'stars'})
        </dd>
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

  return (
    <StackedVariantsPlot
      onClickVariant={onClickVariant}
      scalePosition={scalePosition}
      symbolColor={variant => CLINICAL_SIGNIFICANCE_CATEGORY_COLORS[variant.category]}
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
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 1em;
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

const ClinvarVariantTrack = ({ variants }) => {
  const [includedCategories, setIncludedCategories] = useState({
    pathogenic: true,
    uncertain: true,
    benign: true,
    other: true,
  })
  const [isExpanded, setIsExpanded] = useState(false)

  const filteredVariants = variants.filter(
    v => includedCategories[clinvarVariantClinicalSignificanceCategory(v)]
  )

  return (
    <Wrapper>
      <Track
        renderLeftPanel={() => (
          <TitlePanel>ClinVar variants ({filteredVariants.length})</TitlePanel>
        )}
        renderTopPanel={() => (
          <TopPanel>
            <CategoryFilterControl
              categories={[
                {
                  id: 'pathogenic',
                  label: 'Pathogenic / likely pathogenic',
                  color: CLINICAL_SIGNIFICANCE_CATEGORY_COLORS.pathogenic,
                },
                {
                  id: 'uncertain',
                  label: 'Uncertain significance / conflicting',
                  color: CLINICAL_SIGNIFICANCE_CATEGORY_COLORS.uncertain,
                },
                {
                  id: 'benign',
                  label: 'Benign / likely benign',
                  color: CLINICAL_SIGNIFICANCE_CATEGORY_COLORS.benign,
                },
                {
                  id: 'other',
                  label: 'Other',
                  color: CLINICAL_SIGNIFICANCE_CATEGORY_COLORS.other,
                },
              ]}
              categorySelections={includedCategories}
              id="clinvar-track-included-categories"
              onChange={setIncludedCategories}
            />

            <Button
              onClick={() => {
                setIsExpanded(!isExpanded)
              }}
            >
              {isExpanded ? 'Collapse to bins' : 'Expand to all variants'}
            </Button>
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
  variants: PropTypes.arrayOf(ClinvarVariantPropType).isRequired,
}

export default React.memo(ClinvarVariantTrack)
