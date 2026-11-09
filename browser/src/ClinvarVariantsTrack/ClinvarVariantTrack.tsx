import React, { useState } from 'react'
import styled from 'styled-components'

import { Track } from '@gnomad/region-viewer'
import { Button, Checkbox, Modal, ExternalLink } from '@gnomad/ui'
import CategoryFilterControl from '../CategoryFilterControl'
import InfoButton from '../help/InfoButton'
import filterVariantsInZoomRegion from '../RegionViewer/filterVariantsInZoomRegion'
import { PageType, TrackPageSection } from '../TrackPage'
import { VEP_CONSEQUENCE_CATEGORIES, VEP_CONSEQUENCE_CATEGORY_LABELS } from '../vepConsequences'

import {
  CLINICAL_SIGNIFICANCE_CATEGORIES,
  CLINICAL_SIGNIFICANCE_CATEGORY_LABELS,
  CLINICAL_SIGNIFICANCE_CATEGORY_COLORS,
} from './clinvarVariantCategories'
import ClinvarAllVariantsPlot from './ClinvarAllVariantsPlot'
import ClinvarBinnedVariantsPlot from './ClinvarBinnedVariantsPlot'
import ClinvarVariantDetails from './ClinvarVariantDetails'
import formatClinvarDate from './formatClinvarDate'
import useClinvarVariantFiltering, { ClinvarVariantFiltering } from './useClinvarVariantFiltering'
import { ClinvarVariant } from '../VariantPage/VariantPage'
import { Transcript } from '../TranscriptPage/TranscriptPage'
import { ReferenceGenome } from '../../../dataset-metadata/metadata'

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

type ControlledClinvarVariantTrackProps = Omit<Props, 'variants'> & {
  selection: ClinvarVariantFiltering
}

export const ControlledClinvarVariantTrack = ({
  referenceGenome,
  transcripts,
  selection,
}: ControlledClinvarVariantTrackProps) => {
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const { filter, setFilter, filteredVariants } = selection
  const {
    includedClinicalSignificanceCategories,
    includedConsequenceCategories,
    showOnlyGnomad,
    starFilter,
  } = filter

  const setIncludedClinicalSignificanceCategories = (categories: Record<string, boolean>) => {
    setFilter((previousFilter) => ({
      ...previousFilter,
      includedClinicalSignificanceCategories: categories,
    }))
  }
  const setIncludedConsequenceCategories = (categories: Record<string, boolean>) => {
    setFilter((previousFilter) => ({
      ...previousFilter,
      includedConsequenceCategories: categories,
    }))
  }
  const setShowOnlyGnomad = (value: boolean) => {
    setFilter((previousFilter) => ({ ...previousFilter, showOnlyGnomad: value }))
  }
  const setStarFilter = (value: number) => {
    setFilter((previousFilter) => ({ ...previousFilter, starFilter: value }))
  }

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
            <Checkbox
              id="clinvar-track-in-gnomad"
              label="Only show ClinVar variants that are in gnomAD"
              checked={showOnlyGnomad}
              onChange={setShowOnlyGnomad}
            />
            <label htmlFor="star-filtering">
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

const UnmemoizedClinvarVariantTrack = ({ variants, ...props }: Props) => {
  const selection = useClinvarVariantFiltering(variants)
  return <ControlledClinvarVariantTrack {...props} selection={selection} />
}

export const ClinvarVariantTrack = React.memo(UnmemoizedClinvarVariantTrack)

type ClinvarVariantsProps = {
  clinvarVariants: ClinvarVariant[] | null | undefined
  clinvarReleaseDate: string
  referenceGenome: ReferenceGenome
  transcripts: Transcript[]
  zoomRegion?: { start: number; stop: number } | null
  pageType: PageType
  selection?: ClinvarVariantFiltering
}

const ClinvarVariants = ({
  clinvarVariants,
  clinvarReleaseDate,
  referenceGenome,
  transcripts,
  zoomRegion = null,
  pageType,
  selection,
}: ClinvarVariantsProps) => {
  const heading = (
    <TrackPageSection>
      <h2>ClinVar variants</h2>
    </TrackPageSection>
  )

  const clinvarUnavailableMessage = (
    <TrackPageSection as="p">
      ClinVar variants could not be loaded. Other data on this page is unaffected.
    </TrackPageSection>
  )

  if (!clinvarVariants) {
    return (
      <>
        {heading}
        {clinvarUnavailableMessage}
      </>
    )
  }

  const standaloneTrack = !selection && (
    <ClinvarVariantTrack
      referenceGenome={referenceGenome}
      transcripts={transcripts}
      variants={filterVariantsInZoomRegion(clinvarVariants, zoomRegion)}
    />
  )
  const controlledTrack = selection && (
    <ControlledClinvarVariantTrack
      referenceGenome={referenceGenome}
      transcripts={transcripts}
      selection={selection}
    />
  )

  const clinvarVariantTrack = (
    <>
      {selection ? controlledTrack : standaloneTrack}
      <TrackPageSection as="p">
        Data displayed here is from ClinVar&apos;s {formatClinvarDate(clinvarReleaseDate)} release.
      </TrackPageSection>
    </>
  )

  const noClinvarVariantsFoundMessage = (
    <TrackPageSection as="p">{`No ClinVar variants found in this ${pageType}.`}</TrackPageSection>
  )

  return (
    <>
      {heading}
      {clinvarVariants.length > 0 ? clinvarVariantTrack : noClinvarVariantsFoundMessage}
    </>
  )
}

export default ClinvarVariants
