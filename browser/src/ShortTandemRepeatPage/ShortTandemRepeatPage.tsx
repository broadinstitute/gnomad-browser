import React, { useState } from 'react'
import styled from 'styled-components'

import { Badge, Button, ExternalLink, List, ListItem, Modal, Select } from '@gnomad/ui'

import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import Link from '../Link'
import TableWrapper from '../TableWrapper'
import InfoButton from '../help/InfoButton'
import ControlSection from '../VariantPage/ControlSection'

import ShortTandemRepeatAgeDistributionPlot from './ShortTandemRepeatAgeDistributionPlot'
import ShortTandemRepeatAssociatedDiseasesTable from './ShortTandemRepeatAssociatedDiseasesTable'
import ShortTandemRepeatAttributes from './ShortTandemRepeatAttributes'
import ShortTandemRepeatPopulationOptions from './ShortTandemRepeatPopulationOptions'
import ShortTandemRepeatColorBySelect from './ShortTandemRepeatColorBySelect'
import ShortTandemRepeatAlleleSizeDistributionPlot, {
  ColorBy,
  Sex,
  ScaleType,
  AlleleSizeDistributionItem,
} from './ShortTandemRepeatAlleleSizeDistributionPlot'
import ShortTandemRepeatGenotypeDistributionPlot, {
  Bin as GenotypeBin,
} from './ShortTandemRepeatGenotypeDistributionPlot'
import ShortTandemRepeatGenotypeDistributionBinDetails from './ShortTandemRepeatGenotypeDistributionBinDetails'
import ShortTandemRepeatGenotypeDistributionRepeatUnitsSelect from './ShortTandemRepeatGenotypeDistributionRepeatUnitsSelect'
import ShortTandemRepeatReads from './ShortTandemRepeatReads'
import {
  getSelectedAlleleSizeDistribution,
  getSelectedGenotypeDistribution,
  getGenotypeDistributionPlotAxisLabels,
  maxAlleleSizeDistributionRepeats,
  maxGenotypeDistributionRepeats,
  genotypeRepunitPairs,
} from './shortTandemRepeatHelpers'
import ShortTandemRepeatAdjacentRepeatSection from './ShortTandemRepeatAdjacentRepeatSection'
import { PopulationId } from '@gnomad/dataset-metadata/gnomadPopulations'
import { GenotypeQuality } from './qualityDescription'
import { QScoreBin } from './qScore'

type ShortTandemRepeatReferenceRegion = {
  chrom: string
  start: number
  stop: number
}

export type AlleleSizeDistributionCohort = {
  ancestry_group: PopulationId
  sex: Sex
  repunit: string
  quality_description: GenotypeQuality
  q_score: QScoreBin
  distribution: AlleleSizeDistributionItem[]
}

export type GenotypeDistributionItem = {
  short_allele_repunit_count: number
  long_allele_repunit_count: number
  frequency: number
}

export type GenotypeDistributionCohort = {
  ancestry_group: string
  sex: Sex
  short_allele_repunit: string
  long_allele_repunit: string
  quality_description: GenotypeQuality
  q_score: QScoreBin
  distribution: GenotypeDistributionItem[]
}

export type AgeDistributionItem = {
  age_range: [number | null, number | null]
  distribution: number[][]
}

export type ShortTandemRepeatAdjacentRepeat = {
  id: string
  reference_region: ShortTandemRepeatReferenceRegion
  reference_repeat_unit: string
  repeat_units: string[]
  allele_size_distribution: AlleleSizeDistributionCohort[]
  genotype_distribution: GenotypeDistributionCohort[]
}

export type PlotRange = {
  label: string
  start: number
  stop: number
}

export type RepeatUnitClassification = 'benign' | 'pathogenic' | 'unknown'

export type ShortTandemRepeat = {
  id: string
  gene: {
    ensembl_id: string
    symbol: string
    region: string
  }
  associated_diseases: {
    name: string
    symbol: string
    omim_id: string | null
    inheritance_mode: string
    repeat_size_classifications: {
      classification: string
      min: number | null
      max: number | null
    }[]
    notes: string | null
  }[]
  stripy_id: string | null
  main_reference_region: ShortTandemRepeatReferenceRegion
  reference_regions: ShortTandemRepeatReferenceRegion[]
  reference_repeat_unit: string
  repeat_units: {
    repeat_unit: string
    classification: RepeatUnitClassification
  }[]
  allele_size_distribution: AlleleSizeDistributionCohort[]
  genotype_distribution: GenotypeDistributionCohort[]
  age_distribution: AgeDistributionItem[]
  adjacent_repeats: ShortTandemRepeatAdjacentRepeat[]
}

const ResponsiveSection = styled.section`
  width: calc(50% - 15px);

  @media (max-width: 992px) {
    width: 100%;
  }
`

const FlexWrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  width: 100%;
`

type ShortTandemRepeatPageProps = {
  datasetId: DatasetId
  shortTandemRepeat: ShortTandemRepeat
}

// Stacked bar plots only make sense when the y scale factor stays constant
// throughout, so log scale is only allowed when there's only one bar per
// column, that is, when not breaking down the data into subsets.
const logScaleAllowed = (colorBy: ColorBy | '') => colorBy === ''

const ShortTandemRepeatPage = ({ datasetId, shortTandemRepeat }: ShortTandemRepeatPageProps) => {
  const { allele_size_distribution } = shortTandemRepeat

  const alleleSizeDistributionRepunits = [
    ...new Set(allele_size_distribution.map((cohort) => cohort.repunit)),
  ].sort()
  const genotypeDistributionRepunitPairs = genotypeRepunitPairs(shortTandemRepeat)

  const defaultAlleleSizeRepunit =
    alleleSizeDistributionRepunits.length === 1 ? alleleSizeDistributionRepunits[0] : ''
  const defaultGenotypeDistributionRepunits =
    genotypeDistributionRepunitPairs.length === 1 ? genotypeDistributionRepunitPairs[0] : ''
  const defaultDisease =
    shortTandemRepeat.associated_diseases.length > 0
      ? shortTandemRepeat.associated_diseases[0].name
      : ''

  const [selectedPopulation, setSelectedPopulation] = useState<PopulationId | ''>('')
  const [selectedSex, setSelectedSex] = useState<Sex | ''>('')
  const [selectedScaleType, setSelectedScaleType] = useState<ScaleType>('linear')
  const [selectedColorBy, rawSetSelectedColorBy] = useState<ColorBy | ''>('')

  const setSelectedColorBy = (newColorBy: ColorBy | '') => {
    if (selectedScaleType === 'log' && !logScaleAllowed(newColorBy)) {
      setSelectedScaleType('linear')
    }
    rawSetSelectedColorBy(newColorBy)
  }

  const [selectedAlleleSizeRepeatUnit, setSelectedAlleleSizeRepeatUnit] =
    useState<string>(defaultAlleleSizeRepunit)
  const [selectedGenotypeDistributionRepeatUnits, setSelectedGenotypeDistributionRepeatUnits] =
    useState<string[] | ''>(defaultGenotypeDistributionRepunits)
  const [selectedDisease, setSelectedDisease] = useState<string>(defaultDisease)
  const [showAdjacentRepeats, setShowAdjacentRepeats] = useState<boolean>(false)

  const populations = [
    ...new Set(shortTandemRepeat.allele_size_distribution.map((cohort) => cohort.ancestry_group)),
  ].sort()

  const allRepeatUnitsByClassification: Record<string, string[]> = {}
  shortTandemRepeat.repeat_units.forEach((repeatUnit) => {
    if (allRepeatUnitsByClassification[repeatUnit.classification] === undefined) {
      allRepeatUnitsByClassification[repeatUnit.classification] = []
    }
    allRepeatUnitsByClassification[repeatUnit.classification].push(repeatUnit.repeat_unit)
  })

  // This uses repeat units from shortTandemRepeat.allele_size_distribution.repeat_units because
  // shortTandemRepeat.repeat_units may include repeat units that do not appear in gnomAD.
  const repeatUnitsFoundInGnomad = new Set(
    shortTandemRepeat.allele_size_distribution.map((cohort) => cohort.repunit)
  )

  const repeatUnitsFoundInGnomadByClassification: Record<string, string[]> = {}
  Object.keys(allRepeatUnitsByClassification).forEach((classification) => {
    repeatUnitsFoundInGnomadByClassification[classification] = allRepeatUnitsByClassification[
      classification
    ].filter((repeatUnit) => repeatUnitsFoundInGnomad.has(repeatUnit))
  })

  const allRepeatUnitsFoundInGnomadArePathogenic = Object.keys(
    repeatUnitsFoundInGnomadByClassification
  )
    .filter((classification) => classification !== 'pathogenic')
    .every(
      (classification) =>
        (repeatUnitsFoundInGnomadByClassification[classification] || []).length === 0
    )

  const diseaseToPlot = shortTandemRepeat.associated_diseases.find(
    (disease) => disease.name === selectedDisease
  )
  const repeatSizeClassificationsToPlot = diseaseToPlot
    ? diseaseToPlot.repeat_size_classifications
    : []

  const plotRanges: PlotRange[] = repeatSizeClassificationsToPlot.map((classification) => {
    return {
      label: classification.classification,
      start: classification.min !== null ? classification.min : 0,
      stop: classification.max !== null ? classification.max + 1 : Infinity,
    }
  })

  const [selectedGenotypeDistributionBin, setSelectedGenotypeDistributionBin] =
    useState<GenotypeBin | null>(null)

  const maxAlleleRepeats = maxAlleleSizeDistributionRepeats(shortTandemRepeat)

  const isRepunitSelectionPathogenic = (
    selectedRepeatUnits: string[] | '',
    selectionIndex: number
  ) =>
    (selectedRepeatUnits === '' && allRepeatUnitsFoundInGnomadArePathogenic) ||
    (allRepeatUnitsByClassification.pathogenic || []).includes(
      selectedGenotypeDistributionRepeatUnits[selectionIndex]
    )

  return (
    <>
      <FlexWrapper style={{ marginBottom: '3em' }}>
        <ResponsiveSection>
          <ShortTandemRepeatAttributes shortTandemRepeat={shortTandemRepeat} />
          {!allRepeatUnitsFoundInGnomadArePathogenic && (
            <p style={{ marginBottom: 0 }}>
              <Badge level="info">Note</Badge> This locus has both pathogenic and non-pathogenic
              repeat units.
            </p>
          )}
        </ResponsiveSection>
        <ResponsiveSection>
          {shortTandemRepeat.stripy_id && (
            <>
              <h2>External Resources</h2>
              {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
              <List>
                {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <ListItem>
                  {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
                  <ExternalLink href={`https://stripy.org/database/${shortTandemRepeat.stripy_id}`}>
                    STRipy
                  </ExternalLink>
                </ListItem>
                {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <ListItem>
                  {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
                  <ExternalLink
                    href={`https://strchive.org/database/${shortTandemRepeat.stripy_id}.html`}
                  >
                    STRchive
                  </ExternalLink>
                </ListItem>
              </List>
            </>
          )}
          <h2>TRs in gnomAD</h2>
          <p>
            <Link to="/short-tandem-repeats">Known disease-associated TRs </Link>
          </p>
        </ResponsiveSection>
      </FlexWrapper>
      <section style={{ marginBottom: '3em' }}>
        <h2>
          Associated Diseases <InfoButton topic="str-associated-diseases" />
        </h2>
        <TableWrapper>
          <ShortTandemRepeatAssociatedDiseasesTable shortTandemRepeat={shortTandemRepeat} />
        </TableWrapper>
      </section>

      <section style={{ marginBottom: '3em' }}>
        <h2>
          Allele Size Distribution <InfoButton topic="str-allele-size-distribution" />
        </h2>
        <ShortTandemRepeatAlleleSizeDistributionPlot
          maxRepeats={maxAlleleRepeats}
          alleleSizeDistribution={getSelectedAlleleSizeDistribution(shortTandemRepeat, {
            selectedPopulation,
            selectedSex,
            selectedColorBy,
            selectedRepeatUnit: selectedAlleleSizeRepeatUnit,
          })}
          colorBy={selectedColorBy}
          repeatUnitLength={
            selectedAlleleSizeRepeatUnit &&
            !selectedAlleleSizeRepeatUnit.startsWith('classification')
              ? selectedAlleleSizeRepeatUnit.length
              : null
          }
          ranges={
            (selectedAlleleSizeRepeatUnit === '' && allRepeatUnitsFoundInGnomadArePathogenic) ||
            selectedAlleleSizeRepeatUnit === 'classification/pathogenic' ||
            ((repeatUnitsFoundInGnomadByClassification as any).pathogenic || []).includes(
              selectedAlleleSizeRepeatUnit
            )
              ? plotRanges
              : []
          }
          scaleType={selectedScaleType}
        />
        <ControlSection style={{ marginTop: '0.5em' }}>
          <ShortTandemRepeatPopulationOptions
            id={`${shortTandemRepeat.id}-repeat-counts`}
            populations={populations}
            selectedPopulation={selectedPopulation}
            selectedSex={selectedSex}
            setSelectedPopulation={setSelectedPopulation}
            setSelectedSex={setSelectedSex}
          />
          <ShortTandemRepeatColorBySelect
            id={`${shortTandemRepeat.id}-color-by`}
            selectedColorBy={selectedColorBy}
            setSelectedColorBy={setSelectedColorBy}
            setSelectedScaleType={setSelectedScaleType}
          />

          {alleleSizeDistributionRepunits.length > 1 && (
            <label htmlFor={`short-tandem-repeat-${shortTandemRepeat.id}-repeat-unit`}>
              Repeat unit: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
              <Select
                id={`short-tandem-repeat-${shortTandemRepeat.id}-repeat-unit`}
                value={selectedAlleleSizeRepeatUnit}
                onChange={(e: { target: { value: string } }) => {
                  setSelectedAlleleSizeRepeatUnit(e.target.value)
                }}
              >
                <option value="">All</option>
                {Object.keys(allRepeatUnitsByClassification).length > 1 && (
                  <>
                    <optgroup label="Grouped by classification">
                      {['pathogenic', 'benign', 'unknown'].map((classification) => {
                        const foundInGnomad =
                          (repeatUnitsFoundInGnomadByClassification[classification] || []).length >
                          0
                        return (
                          <option
                            key={classification}
                            value={`classification/${classification}`}
                            disabled={!foundInGnomad}
                          >
                            {foundInGnomad
                              ? `All ${classification}`
                              : `All ${classification} (not found in gnomAD)`}
                          </option>
                        )
                      })}
                    </optgroup>
                  </>
                )}
                {['pathogenic', 'benign', 'unknown']
                  .filter(
                    (classification) =>
                      (allRepeatUnitsByClassification[classification] || []).length > 0
                  )
                  .map((classification) => (
                    <optgroup
                      key={classification}
                      label={`${classification.charAt(0).toUpperCase()}${classification.slice(1)}`}
                    >
                      {allRepeatUnitsByClassification[classification].map((repeatUnit) => {
                        const foundInGnomad = repeatUnitsFoundInGnomad.has(repeatUnit)
                        const notes = []
                        if (repeatUnit === shortTandemRepeat.reference_repeat_unit) {
                          notes.push('reference')
                        }
                        if (!foundInGnomad) {
                          notes.push('not found in gnomAD')
                        }
                        return (
                          <option key={repeatUnit} value={repeatUnit} disabled={!foundInGnomad}>
                            {repeatUnit}
                            {notes.length > 0 && ` (${notes.join(', ')})`}
                          </option>
                        )
                      })}
                    </optgroup>
                  ))}
              </Select>
            </label>
          )}

          <label
            htmlFor={`short-tandem-repeat-${shortTandemRepeat.id}-allele-size-distribution-scale`}
          >
            y-Scale: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
            <Select
              id={`short-tandem-repeat-${shortTandemRepeat.id}-allele-size-distribution-scale`}
              value={selectedScaleType}
              onChange={(e: { target: { value: ScaleType } }) => {
                setSelectedScaleType(e.target.value)
              }}
            >
              <option value="linear">Linear</option>
              {logScaleAllowed(selectedColorBy) && <option value="log">Log</option>}
              <option value="linear-truncated-50">Linear: Truncated at 50</option>
              <option value="linear-truncated-200">Linear: Truncated at 200</option>
              <option value="linear-truncated-1000">Linear: Truncated at 1000</option>
            </Select>
          </label>
        </ControlSection>
        {shortTandemRepeat.associated_diseases.length > 1 && (
          <ControlSection style={{ marginTop: '1em' }}>
            <label
              htmlFor={`short-tandem-repeat-${shortTandemRepeat.id}-allele-size-distribution-selected-disease`}
            >
              Show ranges for{' '}
              {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
              <Select
                id={`short-tandem-repeat-${shortTandemRepeat.id}-allele-size-distribution-selected-disease`}
                value={selectedDisease}
                onChange={(e: { target: { value: string } }) => {
                  setSelectedDisease(e.target.value)
                }}
              >
                {shortTandemRepeat.associated_diseases.map((disease) => {
                  return (
                    <option key={disease.name} value={disease.name}>
                      {disease.name}
                    </option>
                  )
                })}
              </Select>
            </label>
          </ControlSection>
        )}

        {!(
          (selectedAlleleSizeRepeatUnit === '' && allRepeatUnitsFoundInGnomadArePathogenic) ||
          selectedAlleleSizeRepeatUnit === 'classification/pathogenic' ||
          ((allRepeatUnitsByClassification as any).pathogenic || []).includes(
            selectedAlleleSizeRepeatUnit
          )
        ) && (
          <p style={{ marginBottom: 0 }}>
            <Badge level="info">Note</Badge> This plot includes non-pathogenic repeat units. Use the
            &ldquo;Repeat unit&rdquo; menu to view specific repeat units.
          </p>
        )}
      </section>

      <section style={{ marginBottom: '3em' }}>
        <h2>
          Genotype Distribution <InfoButton topic="str-genotype-distribution" />
        </h2>
        <ShortTandemRepeatGenotypeDistributionPlot
          axisLabels={getGenotypeDistributionPlotAxisLabels(shortTandemRepeat, {
            selectedRepeatUnits: selectedGenotypeDistributionRepeatUnits,
          })}
          maxRepeats={maxGenotypeDistributionRepeats(shortTandemRepeat)}
          genotypeDistribution={getSelectedGenotypeDistribution(shortTandemRepeat, {
            selectedRepeatUnits: selectedGenotypeDistributionRepeatUnits,
            selectedPopulation,
            selectedSex,
          })}
          xRanges={
            isRepunitSelectionPathogenic(selectedGenotypeDistributionRepeatUnits, 0)
              ? plotRanges
              : []
          }
          yRanges={
            isRepunitSelectionPathogenic(selectedGenotypeDistributionRepeatUnits, 1)
              ? plotRanges
              : []
          }
          onSelectBin={(bin: GenotypeBin) => {
            if (bin.xRange[0] !== bin.xRange[1] || bin.yRange[0] !== bin.yRange[1]) {
              setSelectedGenotypeDistributionBin(bin)
            }
          }}
        />
        <ControlSection style={{ marginTop: '0.5em' }}>
          <ShortTandemRepeatPopulationOptions
            id={`${shortTandemRepeat.id}-genotype-distribution`}
            populations={populations}
            selectedPopulation={selectedPopulation}
            selectedSex={selectedSex}
            setSelectedPopulation={setSelectedPopulation}
            setSelectedSex={setSelectedSex}
          />
          <ShortTandemRepeatGenotypeDistributionRepeatUnitsSelect
            shortTandemRepeatOrAdjacentRepeat={shortTandemRepeat}
            selectedRepeatUnits={selectedGenotypeDistributionRepeatUnits}
            setSelectedRepeatUnits={setSelectedGenotypeDistributionRepeatUnits}
          />
        </ControlSection>
        {shortTandemRepeat.associated_diseases.length > 1 && (
          <ControlSection style={{ marginTop: '1em' }}>
            <label
              htmlFor={`short-tandem-repeat-${shortTandemRepeat.id}-genotype-distribution-selected-disease`}
            >
              Show ranges for{' '}
              {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
              <Select
                id={`short-tandem-repeat-${shortTandemRepeat.id}-genotype-distribution-selected-disease`}
                value={selectedDisease}
                onChange={(e: { target: { value: string } }) => {
                  setSelectedDisease(e.target.value)
                }}
              >
                {shortTandemRepeat.associated_diseases.map((disease) => {
                  return (
                    <option key={disease.name} value={disease.name}>
                      {disease.name}
                    </option>
                  )
                })}
              </Select>
            </label>
          </ControlSection>
        )}

        {((selectedGenotypeDistributionRepeatUnits === '' &&
          !allRepeatUnitsFoundInGnomadArePathogenic) ||
          !(selectedGenotypeDistributionRepeatUnits as string[]).every((repeatUnit) =>
            ((allRepeatUnitsByClassification as any).pathogenic || []).includes(repeatUnit)
          )) && (
          <p style={{ marginBottom: 0 }}>
            <Badge level="info">Note</Badge> This plot includes non-pathogenic repeat units. Use the
            &ldquo;Repeat units&rdquo; menu to view specific repeat units.
          </p>
        )}
      </section>

      {selectedGenotypeDistributionBin && (
        <Modal
          title={selectedGenotypeDistributionBin.label}
          size="large"
          // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; title: any; size: "larg... Remove this comment to see the full error message
          initialFocusOnButton={false}
          onRequestClose={() => {
            setSelectedGenotypeDistributionBin(null)
          }}
        >
          <ShortTandemRepeatGenotypeDistributionBinDetails
            shortTandemRepeatOrAdjacentRepeat={shortTandemRepeat}
            bin={selectedGenotypeDistributionBin}
            selectedRepeatUnits={selectedGenotypeDistributionRepeatUnits}
            selectedPopulation={selectedPopulation}
            selectedSex={selectedSex}
            repeatUnitPairs={genotypeDistributionRepunitPairs}
          />
        </Modal>
      )}

      <section style={{ marginBottom: '3em' }}>
        <h2>
          Age Distribution <InfoButton topic="str-age-distribution" />
        </h2>
        <ShortTandemRepeatAgeDistributionPlot
          ageDistribution={shortTandemRepeat.age_distribution}
          maxRepeats={maxAlleleRepeats}
          ranges={allRepeatUnitsFoundInGnomadArePathogenic ? plotRanges : []}
        />
        {!allRepeatUnitsFoundInGnomadArePathogenic && (
          <p style={{ marginBottom: 0 }}>
            <Badge level="info">Note</Badge> This plot includes non-pathogenic repeat units.
          </p>
        )}
      </section>

      {false && (
        <section style={{ marginBottom: '3em' }}>
          <h2>
            Adjacent Repeats <InfoButton topic="str-adjacent-repeats" />
          </h2>
          {showAdjacentRepeats ? (
            shortTandemRepeat.adjacent_repeats.map((adjacentRepeat) => {
              return (
                <ShortTandemRepeatAdjacentRepeatSection
                  key={adjacentRepeat.id}
                  adjacentRepeat={adjacentRepeat}
                  populations={populations}
                  selectedPopulation={selectedPopulation}
                  selectedSex={selectedSex}
                  selectedColorBy={selectedColorBy}
                  selectedScaleType={selectedScaleType}
                  selectedGenotypeDistributionBin={selectedGenotypeDistributionBin}
                  setSelectedPopulation={setSelectedPopulation}
                  setSelectedSex={setSelectedSex}
                  setSelectedScaleType={setSelectedScaleType}
                  setSelectedGenotypeDistributionBin={setSelectedGenotypeDistributionBin}
                />
              )
            })
          ) : (
            <Button
              onClick={() => {
                setShowAdjacentRepeats(true)
              }}
            >
              Show {shortTandemRepeat.adjacent_repeats.length} adjacent repeat
              {shortTandemRepeat.adjacent_repeats.length > 1 && 's'}
            </Button>
          )}
        </section>
      )}

      <section>
        <h2>
          Read Data{' '}
          <InfoButton
            topic={
              alleleSizeDistributionRepunits.length > 1
                ? 'str-read-data-multiple-repeat-units'
                : 'str-read-data'
            }
          />
        </h2>
        <ControlSection style={{ marginBottom: '1em' }}>
          <ShortTandemRepeatPopulationOptions
            id={`${shortTandemRepeat.id}-genotype-distribution`}
            populations={populations}
            selectedPopulation={selectedPopulation}
            selectedSex={selectedSex}
            setSelectedPopulation={setSelectedPopulation}
            setSelectedSex={setSelectedSex}
          />
        </ControlSection>
        <ShortTandemRepeatReads
          datasetId={datasetId}
          shortTandemRepeat={shortTandemRepeat}
          maxRepeats={maxAlleleRepeats}
          alleleSizeDistributionRepeatUnits={alleleSizeDistributionRepunits}
          filter={{ population: selectedPopulation, sex: selectedSex }}
        />
      </section>
    </>
  )
}

export default ShortTandemRepeatPage
