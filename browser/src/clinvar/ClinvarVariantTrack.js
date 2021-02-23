import PropTypes from 'prop-types'
import React, { useState } from 'react'
import styled from 'styled-components'

import { Track } from '@gnomad/region-viewer'
import { Button, CategoryFilterControl, Checkbox } from '@gnomad/ui'

import InfoButton from '../help/InfoButton'

import {
  CLINICAL_SIGNIFICANCE_CATEGORIES,
  CLINICAL_SIGNIFICANCE_CATEGORY_LABELS,
  CLINICAL_SIGNIFICANCE_CATEGORY_COLORS,
  clinvarVariantClinicalSignificanceCategory,
} from './clinvarVariantCategories'
import ClinvarAllVariantsPlot from './ClinvarAllVariantsPlot'
import ClinvarBinnedVariantsPlot from './ClinvarBinnedVariantsPlot'
import ClinvarVariantPropType from './ClinvarVariantPropType'

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
  const [showOnlyGnomad, setShowOnlyGnomad] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const filteredVariants = variants.filter(
    v =>
      includedCategories[clinvarVariantClinicalSignificanceCategory(v)] &&
      (!showOnlyGnomad || v.in_gnomad)
  )

  return (
    <Track
      renderLeftPanel={() => <TitlePanel>ClinVar variants ({filteredVariants.length})</TitlePanel>}
      renderTopPanel={() => (
        <TopPanel>
          <div>
            <div style={{ marginBottom: '0.5em' }}>
              <CategoryFilterControl
                categories={CLINICAL_SIGNIFICANCE_CATEGORIES.map(category => ({
                  id: category,
                  label: CLINICAL_SIGNIFICANCE_CATEGORY_LABELS[category],
                  color: CLINICAL_SIGNIFICANCE_CATEGORY_COLORS[category],
                }))}
                categorySelections={includedCategories}
                id="clinvar-track-included-categories"
                onChange={setIncludedCategories}
              />{' '}
              <InfoButton topic="clinvar-variant-categories" />
            </div>
            <Checkbox
              id="clinvar-track-in-gnomad"
              label="Only show ClinVar variants that are in gnomAD"
              checked={showOnlyGnomad}
              onChange={setShowOnlyGnomad}
            />
          </div>

          <Button
            onClick={() => {
              setIsExpanded(!isExpanded)
            }}
            style={{ flexShrink: 0 }}
          >
            {isExpanded ? 'Collapse to bins' : 'Expand to all variants'}
          </Button>
        </TopPanel>
      )}
    >
      {({ scalePosition, width }) => {
        const PlotComponent = isExpanded ? ClinvarAllVariantsPlot : ClinvarBinnedVariantsPlot

        return (
          <PlotWrapper>
            <PlotComponent
              includedCategories={includedCategories}
              scalePosition={scalePosition}
              variants={filteredVariants}
              width={width}
            />
          </PlotWrapper>
        )
      }}
    </Track>
  )
}

ClinvarVariantTrack.propTypes = {
  variants: PropTypes.arrayOf(ClinvarVariantPropType).isRequired,
}

export default React.memo(ClinvarVariantTrack)
