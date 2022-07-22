import React, { useState } from 'react'
import styled from 'styled-components'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
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

type Props = {
  referenceGenome: 'GRCh37' | 'GRCh38'
  transcripts: any[]
  variants: ClinvarVariantPropType[]
}

const ClinvarVariantTrack = ({ referenceGenome, transcripts, variants }: Props) => {
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
    (v) =>
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      includedClinicalSignificanceCategories[clinvarVariantClinicalSignificanceCategory(v)] &&
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
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
                categories={CLINICAL_SIGNIFICANCE_CATEGORIES.map((category) => ({
                  id: category,
                  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                  label: CLINICAL_SIGNIFICANCE_CATEGORY_LABELS[category],
                  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
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
              {VEP_CONSEQUENCE_CATEGORIES.map((category) => (
                <ConsequenceCategoryFilter key={category}>
                  <Checkbox
                    id={`clinvar-track-include-${category}`}
                    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    label={VEP_CONSEQUENCE_CATEGORY_LABELS[category]}
                    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    checked={includedConsequenceCategories[category]}
                    onChange={(value) => {
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
              <SelectCategoryButton
                style={{ marginLeft: '0.5em' }}
                onClick={() => {
                  setIncludedConsequenceCategories({
                    ...VEP_CONSEQUENCE_CATEGORIES.reduce(
                      (acc, c) => ({
                        ...acc,
                        [c]: true,
                      }),
                      {}
                    ),
                  })
                }}
              >
                all
              </SelectCategoryButton>
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
        {({ scalePosition, width }: any) => {
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
              // @ts-expect-error TS(2322) FIXME: Type '{ includedCategories: {}; scalePosition: any... Remove this comment to see the full error message
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
          title={(selectedVariant as any).variant_id}
          onRequestClose={() => {
            setSelectedVariant(null)
          }}
        >
          <ClinvarVariantDetails
            referenceGenome={referenceGenome}
            variantId={(selectedVariant as any).variant_id}
          />
        </Modal>
      )}
    </>
  )
}

export default React.memo(ClinvarVariantTrack)
