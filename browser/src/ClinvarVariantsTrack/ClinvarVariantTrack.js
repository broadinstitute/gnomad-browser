import PropTypes from 'prop-types'
import React, { useState } from 'react'
import styled from 'styled-components'

import { Track } from '@gnomad/region-viewer'
import { Button, Checkbox, Modal } from '@gnomad/ui'

import CategoryFilterControl from '../CategoryFilterControl'
import InfoButton from '../help/InfoButton'
import { TrackPageSection } from '../TrackPage'
import {
  VEP_CONSEQUENCE_CATEGORIES,
  VEP_CONSEQUENCE_CATEGORY_LABELS,
  getCategoryFromConsequence,
} from '../vepConsequences'

import {
  CLINICAL_SIGNIFICANCE_CATEGORIES,
  CLINICAL_SIGNIFICANCE_CATEGORY_LABELS,
  CLINICAL_SIGNIFICANCE_CATEGORY_COLORS,
  clinvarVariantClinicalSignificanceCategory,
} from './clinvarVariantCategories'
import ClinvarAllVariantsPlot from './ClinvarAllVariantsPlot'
import ClinvarBinnedVariantsPlot from './ClinvarBinnedVariantsPlot'
import ClinvarVariantDetails from './ClinvarVariantDetails'
import ClinvarVariantPropType from './ClinvarVariantPropType'

const TopPanel = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: 1em;
`

const ControlRow = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5em;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: flex-start;
  }
`

const TitlePanel = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  padding-right: 20px;
`

const ConsequenceCategoryFiltersWrapper = styled.div`
  display: flex;
  flex-flow: row wrap;

  input[type='checkbox'] {
    position: relative;
    top: 2px;
  }

  label {
    margin-left: 1em;

    &:first-child {
      margin-left: 0;
    }
  }

  @media (max-width: 600px) {
    margin-bottom: 0.5em;
  }
`

const ConsequenceCategoryFilter = styled.div`
  margin-right: 1ch;
`

const SelectCategoryButton = styled(Button)`
  width: 35px;
  height: 20px;
  padding: 0;
  border-radius: 5px;
  line-height: 18px;
`

const ClinvarVariantTrack = ({ referenceGenome, transcripts, variants }) => {
  const [selectedVariant, setSelectedVariant] = useState(null)

  const [
    includedClinicalSignificanceCategories,
    setIncludedClinicalSignificanceCategories,
  ] = useState(
    CLINICAL_SIGNIFICANCE_CATEGORIES.reduce(
      (acc, category) => ({
        ...acc,
        [category]: true,
      }),
      {}
    )
  )

  const [includedConsequenceCategories, setIncludedConsequenceCategories] = useState(
    VEP_CONSEQUENCE_CATEGORIES.reduce(
      (acc, category) => ({
        ...acc,
        [category]: true,
      }),
      {}
    )
  )

  const [showOnlyGnomad, setShowOnlyGnomad] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const filteredVariants = variants.filter(
    v =>
      includedClinicalSignificanceCategories[clinvarVariantClinicalSignificanceCategory(v)] &&
      includedConsequenceCategories[getCategoryFromConsequence(v.major_consequence)] &&
      (!showOnlyGnomad || v.in_gnomad)
  )

  return (
    <>
      <TrackPageSection>
        <TopPanel>
          <ControlRow>
            <div>
              <CategoryFilterControl
                categories={CLINICAL_SIGNIFICANCE_CATEGORIES.map(category => ({
                  id: category,
                  label: CLINICAL_SIGNIFICANCE_CATEGORY_LABELS[category],
                  color: CLINICAL_SIGNIFICANCE_CATEGORY_COLORS[category],
                }))}
                categorySelections={includedClinicalSignificanceCategories}
                id="clinvar-track-included-categories"
                onChange={setIncludedClinicalSignificanceCategories}
              />{' '}
              <InfoButton topic="clinvar-variant-categories" />
            </div>
          </ControlRow>
          <ControlRow>
            <ConsequenceCategoryFiltersWrapper>
              {VEP_CONSEQUENCE_CATEGORIES.map(category => (
                <ConsequenceCategoryFilter key={category}>
                  <Checkbox
                    id={`clinvar-track-include-${category}`}
                    label={VEP_CONSEQUENCE_CATEGORY_LABELS[category]}
                    checked={includedConsequenceCategories[category]}
                    onChange={value => {
                      setIncludedConsequenceCategories({
                        ...includedConsequenceCategories,
                        [category]: value,
                      })
                    }}
                  />{' '}
                  <SelectCategoryButton
                    onClick={() => {
                      setIncludedConsequenceCategories({
                        ...VEP_CONSEQUENCE_CATEGORIES.reduce(
                          (acc, c) => ({
                            ...acc,
                            [c]: c === category,
                          }),
                          {}
                        ),
                      })
                    }}
                  >
                    only
                  </SelectCategoryButton>
                </ConsequenceCategoryFilter>
              ))}
            </ConsequenceCategoryFiltersWrapper>

            <Button
              onClick={() => {
                setIsExpanded(!isExpanded)
              }}
              style={{ flexShrink: 0 }}
            >
              {isExpanded ? 'Collapse to bins' : 'Expand to all variants'}
            </Button>
          </ControlRow>
          <ControlRow>
            <Checkbox
              id="clinvar-track-in-gnomad"
              label="Only show ClinVar variants that are in gnomAD"
              checked={showOnlyGnomad}
              onChange={setShowOnlyGnomad}
            />
          </ControlRow>
        </TopPanel>
      </TrackPageSection>
      <Track
        renderLeftPanel={() => (
          <TitlePanel>ClinVar variants ({filteredVariants.length})</TitlePanel>
        )}
      >
        {({ scalePosition, width }) => {
          return isExpanded ? (
            <ClinvarAllVariantsPlot
              scalePosition={scalePosition}
              transcripts={transcripts}
              variants={filteredVariants}
              width={width}
              onClickVariant={setSelectedVariant}
            />
          ) : (
            <ClinvarBinnedVariantsPlot
              includedCategories={includedClinicalSignificanceCategories}
              scalePosition={scalePosition}
              variants={filteredVariants}
              width={width}
            />
          )
        }}
      </Track>
      {selectedVariant && (
        <Modal
          size="large"
          title={selectedVariant.variant_id}
          onRequestClose={() => {
            setSelectedVariant(null)
          }}
        >
          <ClinvarVariantDetails
            referenceGenome={referenceGenome}
            variantId={selectedVariant.variant_id}
          />
        </Modal>
      )}
    </>
  )
}

ClinvarVariantTrack.propTypes = {
  referenceGenome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
  transcripts: PropTypes.arrayOf(PropTypes.object).isRequired,
  variants: PropTypes.arrayOf(ClinvarVariantPropType).isRequired,
}

export default React.memo(ClinvarVariantTrack)
