import { max, min } from 'd3-array'
import React, { useState } from 'react'
import styled from 'styled-components'

import { Badge, Button, ExternalLink, List, ListItem, Modal, Page, Select } from '@gnomad/ui'

import { labelForDataset } from '../datasets'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import Link from '../Link'
import Query from '../Query'
import TableWrapper from '../TableWrapper'
import InfoButton from '../help/InfoButton'
import ControlSection from '../VariantPage/ControlSection'

import ShortTandemRepeatAdjacentRepeat from './ShortTandemRepeatAdjacentRepeat'
import ShortTandemRepeatAgeDistributionPlot from './ShortTandemRepeatAgeDistributionPlot'
import ShortTandemRepeatAssociatedDiseasesTable from './ShortTandemRepeatAssociatedDiseasesTable'
import ShortTandemRepeatAttributes from './ShortTandemRepeatAttributes'
import ShortTandemRepeatPopulationOptions from './ShortTandemRepeatPopulationOptions'
import { ShortTandemRepeatPropType } from './ShortTandemRepeatPropTypes'
import ShortTandemRepeatAlleleSizeDistributionPlot from './ShortTandemRepeatAlleleSizeDistributionPlot'
import ShortTandemRepeatGenotypeDistributionPlot from './ShortTandemRepeatGenotypeDistributionPlot'
import ShortTandemRepeatGenotypeDistributionBinDetails from './ShortTandemRepeatGenotypeDistributionBinDetails'
import ShortTandemRepeatGenotypeDistributionRepeatUnitsSelect from './ShortTandemRepeatGenotypeDistributionRepeatUnitsSelect'
import ShortTandemRepeatReads from './ShortTandemRepeatReads'
import {
  getSelectedAlleleSizeDistribution,
  getSelectedGenotypeDistribution,
  getGenotypeDistributionPlotAxisLabels,
} from './shortTandemRepeatHelpers'

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

const parseCombinedPopulationId = (combinedPopulationId: any) => {
  let population
  let sex
  if (combinedPopulationId.includes('_')) {
    ;[population, sex] = combinedPopulationId.split('_')
  } else if (combinedPopulationId === 'XX' || combinedPopulationId === 'XY') {
    population = null
    sex = combinedPopulationId
  } else {
    population = combinedPopulationId
    sex = null
  }
  return { population, sex }
}

type ShortTandemRepeatPageProps = {
  datasetId: string
  shortTandemRepeat: ShortTandemRepeatPropType
}

const ShortTandemRepeatPage = ({ datasetId, shortTandemRepeat }: ShortTandemRepeatPageProps) => {
  const [selectedRepeatUnit, setSelectedRepeatUnit] = useState(
    shortTandemRepeat.allele_size_distribution.repeat_units.length === 1
      ? shortTandemRepeat.allele_size_distribution.repeat_units[0].repeat_unit
      : ''
  )

  const [selectedPopulationId, setSelectedPopulationId] = useState('')
  const [selectedScaleType, setSelectedScaleType] = useState('linear')

  const [
    selectedGenotypeDistributionRepeatUnits,
    setSelectedGenotypeDistributionRepeatUnits,
  ] = useState(
    shortTandemRepeat.genotype_distribution.repeat_units.length === 1
      ? shortTandemRepeat.genotype_distribution.repeat_units[0].repeat_units.join(' / ')
      : ''
  )

  const [selectedDisease, setSelectedDisease] = useState(
    shortTandemRepeat.associated_diseases[0].name
  )

  const [showAdjacentRepeats, setShowAdjacentRepeats] = useState(false)
  const [showReadData, setShowReadData] = useState(false)

  const populationIds = shortTandemRepeat.allele_size_distribution.populations.map((pop) => pop.id)

  const allRepeatUnitsByClassification = {}
  shortTandemRepeat.repeat_units.forEach((repeatUnit) => {
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    if (allRepeatUnitsByClassification[repeatUnit.classification] === undefined) {
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      allRepeatUnitsByClassification[repeatUnit.classification] = []
    }
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    allRepeatUnitsByClassification[repeatUnit.classification].push(repeatUnit.repeat_unit)
  })

  // This uses repeat units from shortTandemRepeat.allele_size_distribution.repeat_units because
  // shortTandemRepeat.repeat_units may include repeat units that do not appear in gnomAD.
  const repeatUnitsFoundInGnomad = new Set(
    shortTandemRepeat.allele_size_distribution.repeat_units.map(
      (repeatUnit) => repeatUnit.repeat_unit
    )
  )

  const repeatUnitsFoundInGnomadByClassification = {}
  Object.keys(allRepeatUnitsByClassification).forEach((classification) => {
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    repeatUnitsFoundInGnomadByClassification[classification] = allRepeatUnitsByClassification[
      classification
    ].filter((repeatUnit: any) => repeatUnitsFoundInGnomad.has(repeatUnit))
  })

  const allRepeatUnitsFoundInGnomadArePathogenic = Object.keys(
    repeatUnitsFoundInGnomadByClassification
  )
    .filter((classification) => classification !== 'pathogenic')
    .every(
      (classification) =>
        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        (repeatUnitsFoundInGnomadByClassification[classification] || []).length === 0
    )

  // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
  const plotRanges = shortTandemRepeat.associated_diseases
    .find((disease: any) => disease.name === selectedDisease)
    .repeat_size_classifications.map((classification: any) => {
      return {
        label: classification.classification,
        start: classification.min !== null ? classification.min : 0,
        stop: classification.max !== null ? classification.max + 1 : Infinity,
      }
    })

  const [selectedGenotypeDistributionBin, setSelectedGenotypeDistributionBin] = useState(null)

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
        {shortTandemRepeat.stripy_id && (
          <ResponsiveSection>
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
            </List>
            <h2>Related Loci</h2>
            <p>
              <Link to="/short-tandem-repeats">All pathogenic short tandem repeats in gnomAD</Link>
            </p>
          </ResponsiveSection>
        )}
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
          // @ts-expect-error TS(2322) FIXME: Type '{ maxRepeats: number; alleleSizeDistribution... Remove this comment to see the full error message
          maxRepeats={
            shortTandemRepeat.allele_size_distribution.distribution[
              shortTandemRepeat.allele_size_distribution.distribution.length - 1
            ][0]
          }
          alleleSizeDistribution={getSelectedAlleleSizeDistribution(shortTandemRepeat, {
            selectedPopulationId,
            selectedRepeatUnit,
          })}
          repeatUnitLength={
            selectedRepeatUnit && !selectedRepeatUnit.startsWith('classification')
              ? selectedRepeatUnit.length
              : null
          }
          ranges={
            (selectedRepeatUnit === '' && allRepeatUnitsFoundInGnomadArePathogenic) ||
            selectedRepeatUnit === 'classification/pathogenic' ||
            ((repeatUnitsFoundInGnomadByClassification as any).pathogenic || []).includes(
              selectedRepeatUnit
            )
              ? plotRanges
              : []
          }
          scaleType={selectedScaleType}
        />
        <ControlSection style={{ marginTop: '0.5em' }}>
          <ShortTandemRepeatPopulationOptions
            id={`${shortTandemRepeat.id}-repeat-counts`}
            populationIds={populationIds}
            selectedPopulationId={selectedPopulationId}
            onSelectPopulationId={setSelectedPopulationId}
          />

          <label htmlFor={`short-tandem-repeat-${shortTandemRepeat.id}-repeat-unit`}>
            Repeat unit: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
            <Select
              id={`short-tandem-repeat-${shortTandemRepeat.id}-repeat-unit`}
              value={selectedRepeatUnit}
              onChange={(e: any) => {
                setSelectedRepeatUnit(e.target.value)
              }}
            >
              {shortTandemRepeat.allele_size_distribution.repeat_units.length === 1 ? (
                <>
                  {shortTandemRepeat.allele_size_distribution.repeat_units.map((repeatUnit) => (
                    <option key={repeatUnit.repeat_unit} value={repeatUnit.repeat_unit}>
                      {repeatUnit.repeat_unit}
                    </option>
                  ))}
                </>
              ) : (
                <>
                  <option value="">All</option>
                  {Object.keys(allRepeatUnitsByClassification).length > 1 && (
                    <>
                      <optgroup label="Grouped by classification">
                        {['pathogenic', 'benign', 'unknown'].map((classification) => {
                          const foundInGnomad =
                            // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                            (repeatUnitsFoundInGnomadByClassification[classification] || [])
                              .length > 0
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
                        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                        (allRepeatUnitsByClassification[classification] || []).length > 0
                    )
                    .map((classification) => (
                      <optgroup
                        key={classification}
                        label={`${classification.charAt(0).toUpperCase()}${classification.slice(
                          1
                        )}`}
                      >
                        {/* @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
                        {allRepeatUnitsByClassification[classification].map((repeatUnit: any) => {
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
                </>
              )}
            </Select>
          </label>

          <label
            htmlFor={`short-tandem-repeat-${shortTandemRepeat.id}-allele-size-distribution-scale`}
          >
            Scale: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
            <Select
              id={`short-tandem-repeat-${shortTandemRepeat.id}-allele-size-distribution-scale`}
              value={selectedScaleType}
              onChange={(e: any) => {
                setSelectedScaleType(e.target.value)
              }}
            >
              <option value="linear">Linear</option>
              <option value="log">Log</option>
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
                onChange={(e: any) => {
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
          (selectedRepeatUnit === '' && allRepeatUnitsFoundInGnomadArePathogenic) ||
          selectedRepeatUnit === 'classification/pathogenic' ||
          ((allRepeatUnitsByClassification as any).pathogenic || []).includes(selectedRepeatUnit)
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
          // @ts-expect-error TS(2322) FIXME: Type '{ axisLabels: any; maxRepeats: (string | und... Remove this comment to see the full error message
          axisLabels={getGenotypeDistributionPlotAxisLabels(shortTandemRepeat, {
            selectedRepeatUnits: selectedGenotypeDistributionRepeatUnits,
          })}
          maxRepeats={[
            max(shortTandemRepeat.genotype_distribution.distribution, (d: any) =>
              max(d.slice(0, 2))
            ),
            max(shortTandemRepeat.genotype_distribution.distribution, (d: any) =>
              min(d.slice(0, 2))
            ),
          ]}
          genotypeDistribution={getSelectedGenotypeDistribution(shortTandemRepeat, {
            selectedRepeatUnits: selectedGenotypeDistributionRepeatUnits,
            selectedPopulationId,
          })}
          xRanges={
            (selectedGenotypeDistributionRepeatUnits === '' &&
              allRepeatUnitsFoundInGnomadArePathogenic) ||
            ((allRepeatUnitsByClassification as any).pathogenic || []).includes(
              selectedGenotypeDistributionRepeatUnits.split(' / ')[0]
            )
              ? plotRanges
              : []
          }
          yRanges={
            (selectedGenotypeDistributionRepeatUnits === '' &&
              allRepeatUnitsFoundInGnomadArePathogenic) ||
            ((allRepeatUnitsByClassification as any).pathogenic || []).includes(
              selectedGenotypeDistributionRepeatUnits.split(' / ')[1]
            )
              ? plotRanges
              : []
          }
          onSelectBin={(bin: any) => {
            if (bin.xRange[0] !== bin.xRange[1] || bin.yRange[0] !== bin.yRange[1]) {
              setSelectedGenotypeDistributionBin(bin)
            }
          }}
        />
        <ControlSection style={{ marginTop: '0.5em' }}>
          <ShortTandemRepeatPopulationOptions
            id={`${shortTandemRepeat.id}-genotype-distribution`}
            populationIds={populationIds}
            selectedPopulationId={selectedPopulationId}
            onSelectPopulationId={setSelectedPopulationId}
          />

          <ShortTandemRepeatGenotypeDistributionRepeatUnitsSelect
            shortTandemRepeatOrAdjacentRepeat={shortTandemRepeat}
            value={selectedGenotypeDistributionRepeatUnits}
            onChange={setSelectedGenotypeDistributionRepeatUnits}
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
                onChange={(e: any) => {
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
          !selectedGenotypeDistributionRepeatUnits
            .split(' / ')
            .every((repeatUnit) =>
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
          title={(selectedGenotypeDistributionBin as any).label}
          size="large"
          // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; title: any; size: "larg... Remove this comment to see the full error message
          initialFocusOnButton={false}
          onRequestClose={() => {
            setSelectedGenotypeDistributionBin(null)
          }}
        >
          <ShortTandemRepeatGenotypeDistributionBinDetails
            shortTandemRepeatOrAdjacentRepeat={shortTandemRepeat}
            selectedPopulationId={selectedPopulationId}
            selectedRepeatUnits={selectedGenotypeDistributionRepeatUnits}
            bin={selectedGenotypeDistributionBin}
          />
        </Modal>
      )}

      <section style={{ marginBottom: '3em' }}>
        <h2>
          Age Distribution <InfoButton topic="str-age-distribution" />
        </h2>
        <ShortTandemRepeatAgeDistributionPlot
          // @ts-expect-error TS(2322) FIXME: Type '{ ageDistribution: any; maxRepeats: number; ... Remove this comment to see the full error message
          ageDistribution={(shortTandemRepeat as any).age_distribution}
          maxRepeats={
            shortTandemRepeat.allele_size_distribution.distribution[
              shortTandemRepeat.allele_size_distribution.distribution.length - 1
            ][0]
          }
          ranges={allRepeatUnitsFoundInGnomadArePathogenic ? plotRanges : []}
        />
        {!allRepeatUnitsFoundInGnomadArePathogenic && (
          <p style={{ marginBottom: 0 }}>
            <Badge level="info">Note</Badge> This plot includes non-pathogenic repeat units.
          </p>
        )}
      </section>

      {shortTandemRepeat.adjacent_repeats.length > 0 && (
        <section style={{ marginBottom: '3em' }}>
          <h2>
            Adjacent Repeats <InfoButton topic="str-adjacent-repeats" />
          </h2>
          {showAdjacentRepeats ? (
            shortTandemRepeat.adjacent_repeats.map((adjacentRepeat) => {
              return (
                <ShortTandemRepeatAdjacentRepeat
                  key={adjacentRepeat.id}
                  adjacentRepeat={adjacentRepeat}
                  populationIds={populationIds}
                  selectedPopulationId={selectedPopulationId}
                  onSelectPopulationId={setSelectedPopulationId}
                  selectedScaleType={selectedScaleType}
                  onSelectScaleType={setSelectedScaleType}
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
              shortTandemRepeat.allele_size_distribution.repeat_units.length > 1
                ? 'str-read-data-multiple-repeat-units'
                : 'str-read-data'
            }
          />
        </h2>
        {showReadData ? (
          <>
            <ControlSection style={{ marginBottom: '1em' }}>
              <ShortTandemRepeatPopulationOptions
                id={`${shortTandemRepeat.id}-read-data`}
                populationIds={populationIds}
                selectedPopulationId={selectedPopulationId}
                onSelectPopulationId={setSelectedPopulationId}
              />
            </ControlSection>
            <ShortTandemRepeatReads
              datasetId={datasetId}
              shortTandemRepeat={shortTandemRepeat}
              filter={{
                ...parseCombinedPopulationId(selectedPopulationId),
              }}
            />
          </>
        ) : (
          <Button
            onClick={() => {
              setShowReadData(true)
            }}
          >
            Show read data
          </Button>
        )}
      </section>
    </>
  )
}

const query = `
query ShortTandemRepeat($strId: String!, $datasetId: DatasetId!) {
  short_tandem_repeat(id: $strId, dataset: $datasetId) {
    id
    gene {
      ensembl_id
      symbol
      region
    }
    associated_diseases {
      name
      symbol
      omim_id
      inheritance_mode
      repeat_size_classifications {
        classification
        min
        max
      }
      notes
    }
    reference_region {
      chrom
      start
      stop
    }
    reference_repeat_unit
    repeat_units {
      repeat_unit
      classification
    }
    allele_size_distribution {
      distribution
      populations {
        id
        distribution
      }
      repeat_units {
        repeat_unit
        distribution
        populations {
          id
          distribution
        }
      }
    }
    genotype_distribution {
      distribution
      populations {
        id
        distribution
      }
      repeat_units {
        repeat_units
        distribution
        populations {
          id
          distribution
        }
      }
    }
    age_distribution {
      age_range
      distribution
    }
    stripy_id
    adjacent_repeats {
      id
      reference_region {
        chrom
        start
        stop
      }
      reference_repeat_unit
      repeat_units
      allele_size_distribution {
        distribution
        populations {
          id
          distribution
        }
        repeat_units {
          repeat_unit
          distribution
          populations {
            id
            distribution
          }
        }
      }
      genotype_distribution {
        distribution
        populations {
          id
          distribution
        }
        repeat_units {
          repeat_units
          distribution
          populations {
            id
            distribution
          }
        }
      }
    }
  }
}
`

type ShortTandemRepeatPageContainerProps = {
  datasetId: string
  strId: string
}

const ShortTandemRepeatPageContainer = ({
  datasetId,
  strId,
}: ShortTandemRepeatPageContainerProps) => {
  return (
    // @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
    <Page>
      <DocumentTitle title={`${strId} | Short Tandem Repeat | ${labelForDataset(datasetId)}`} />
      <GnomadPageHeading
        datasetOptions={{
          includeShortVariants: true,
          includeStructuralVariants: false,
          includeExac: false,
          includeGnomad2: false,
          includeGnomad3: true,
          includeGnomad3Subsets: false,
        }}
        selectedDataset={datasetId}
      >
        Short Tandem Repeat: <span>{strId}</span>
      </GnomadPageHeading>
      <Query
        query={query}
        variables={{
          datasetId,
          strId,
        }}
        loadingMessage="Loading short tandem repeat"
        errorMessage="Unable to load short tandem repeat"
        success={(data: any) => data.short_tandem_repeat}
      >
        {({ data }: any) => {
          return (
            <ShortTandemRepeatPage
              datasetId={datasetId}
              shortTandemRepeat={data.short_tandem_repeat}
            />
          )
        }}
      </Query>
    </Page>
  )
}

export default ShortTandemRepeatPageContainer
