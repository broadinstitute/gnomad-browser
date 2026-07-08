import React, { useState } from 'react'
import styled from 'styled-components'

import { Track } from '@gnomad/region-viewer'
import { Button, Checkbox, Modal, ExternalLink } from '@gnomad/ui'
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
import { ClinvarVariant } from '../VariantPage/VariantPage'
import { Transcript } from '../TranscriptPage/TranscriptPage'

const TopPanel = styled.div`
  position: relative;

  /* Sit above the cross-track cursor line (drawn in an absolutely positioned
     overlay) so the line passes behind the filter controls. The controls have
     their own backgrounds, so the line is hidden behind them but stays visible
     (continuous) in the empty space between them. */
  z-index: 1;
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

  /* Opaque page-colored backdrop so the cursor line is masked behind the
     checkbox + label (it still shows in the gaps between filters). */
  background: #fafafa;
`

const SelectCategoryButton = styled(Button)`
  width: 35px;
  height: 20px;
  padding: 0;
  border-radius: 5px;
  line-height: 18px;
`

const FilterRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

type Props = {
  referenceGenome: 'GRCh37' | 'GRCh38'
  transcripts: Transcript[]
  variants: ClinvarVariant[]
}

const ClinvarVariantTrack = ({ referenceGenome, transcripts, variants }: Props) => {
  const [selectedVariant, setSelectedVariant] = useState(null)

  const [includedClinicalSignificanceCategories, setIncludedClinicalSignificanceCategories] =
    useState(
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
  const [starFilter, setStarFilter] = useState(0)

  const filteredVariants = variants.filter(
    (v) =>
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      includedClinicalSignificanceCategories[clinvarVariantClinicalSignificanceCategory(v)] &&
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      includedConsequenceCategories[getCategoryFromConsequence(v.major_consequence)] &&
      (!showOnlyGnomad || v.in_gnomad) &&
      v.gold_stars >= starFilter
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
              {/* Backdrop on the icon so the cursor line doesn't show through its
                  transparent "?" (sized to the icon, so it doesn't break the line). */}
              <InfoButton topic="clinvar-variant-categories" iconBackgroundColor="#fafafa" />
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
          <FilterRow>
            {/* Opaque backdrops so the cursor line is masked behind the text
                controls (it still shows in the gap between them). */}
            <span style={{ background: '#fafafa' }}>
              <Checkbox
                id="clinvar-track-in-gnomad"
                label="Only show ClinVar variants that are in gnomAD"
                checked={showOnlyGnomad}
                onChange={setShowOnlyGnomad}
              />
            </span>
            <label htmlFor="star-filtering" style={{ background: '#fafafa' }}>
              Filter by{' '}
              <ExternalLink href="https://www.ncbi.nlm.nih.gov/clinvar/docs/review_status/">
                review status
              </ExternalLink>
              : &nbsp;
              <select
                id="clinvar-star-filter"
                value={starFilter}
                onChange={(e) => setStarFilter(Number(e.target.value))}
              >
                <option value={0}> 0-4 Stars </option>
                <option value={1}> {'>'}=1 Stars </option>
                <option value={2}> {'>'}=2 Stars </option>
                <option value={3}> {'>'}=3 Stars </option>
                <option value={4}> 4 Stars </option>
              </select>
            </label>
          </FilterRow>
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
