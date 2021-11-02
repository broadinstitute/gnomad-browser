import { max } from 'd3-array'
import PropTypes from 'prop-types'
import React, { useState } from 'react'
import styled from 'styled-components'

import { BaseTable, Button, ExternalLink, List, ListItem, Modal, Page, Select } from '@gnomad/ui'

import { labelForDataset } from '../datasets'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import Query from '../Query'
import TableWrapper from '../TableWrapper'
import ControlSection from '../VariantPage/ControlSection'

import ShortTandemRepeatAdjacentRepeat from './ShortTandemRepeatAdjacentRepeat'
import ShortTandemRepeatAttributes from './ShortTandemRepeatAttributes'
import ShortTandemRepeatPopulationOptions from './ShortTandemRepeatPopulationOptions'
import { ShortTandemRepeatPropType } from './ShortTandemRepeatPropTypes'
import ShortTandemRepeatAlleleSizeDistributionPlot from './ShortTandemRepeatAlleleSizeDistributionPlot'
import ShortTandemRepeatGenotypeDistributionPlot from './ShortTandemRepeatGenotypeDistributionPlot'
import ShortTandemRepeatReads from './ShortTandemRepeatReads'

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

const sumDistributions = distributions => {
  const nByKey = distributions.flat().reduce((acc, d) => {
    const key = d.slice(0, d.length - 1).join('/')
    return {
      ...acc,
      [key]: (acc[key] || 0) + d[d.length - 1],
    }
  }, {})
  return Object.entries(nByKey).map(([key, n]) => [...key.split('/').map(Number), n])
}

const getAlleleSizeDistribution = ({
  shortTandemRepeat,
  selectedRepeatUnit,
  selectedPopulationId,
}) => {
  if (selectedRepeatUnit) {
    if (selectedRepeatUnit.startsWith('classification')) {
      const selectedClassification = selectedRepeatUnit.slice(15)

      const repeatUnitClassification = shortTandemRepeat.repeat_units.reduce(
        (acc, repeatUnit) => ({
          ...acc,
          [repeatUnit.repeat_unit]: repeatUnit.classification,
        }),
        {}
      )

      const repeatUnits = shortTandemRepeat.allele_size_distribution.repeat_units.filter(
        r => repeatUnitClassification[r.repeat_unit] === selectedClassification
      )

      const distributions = repeatUnits.map(
        selectedPopulationId
          ? r => r.populations.find(pop => pop.id === selectedPopulationId).distribution
          : r => r.distribution
      )

      return sumDistributions(distributions)
    }

    const repeatUnit = shortTandemRepeat.allele_size_distribution.repeat_units.find(
      r => r.repeat_unit === selectedRepeatUnit
    )
    if (selectedPopulationId) {
      return repeatUnit.populations.find(pop => pop.id === selectedPopulationId).distribution
    }
    return repeatUnit.distribution
  }

  if (selectedPopulationId) {
    return shortTandemRepeat.allele_size_distribution.populations.find(
      pop => pop.id === selectedPopulationId
    ).distribution
  }

  return shortTandemRepeat.allele_size_distribution.distribution
}

const parseCombinedPopulationId = combinedPopulationId => {
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

const ShortTandemRepeatPage = ({ datasetId, shortTandemRepeat }) => {
  const [selectedRepeatUnit, setSelectedRepeatUnit] = useState(
    shortTandemRepeat.repeat_units.length === 1 ? shortTandemRepeat.repeat_units[0].repeat_unit : ''
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

  const [isReadDataModalOpen, setIsReadDataModalOpen] = useState(false)

  const populationIds = shortTandemRepeat.allele_size_distribution.populations.map(pop => pop.id)

  const repeatUnitsByClassification = {}
  shortTandemRepeat.repeat_units.forEach(repeatUnit => {
    if (repeatUnitsByClassification[repeatUnit.classification] === undefined) {
      repeatUnitsByClassification[repeatUnit.classification] = []
    }
    repeatUnitsByClassification[repeatUnit.classification].push(repeatUnit.repeat_unit)
  })

  const plotRanges = shortTandemRepeat.associated_diseases
    .find(disease => disease.name === selectedDisease)
    .repeat_size_classifications.map(classification => {
      return {
        label: classification.classification,
        start: classification.min !== null ? classification.min : 0,
        stop: classification.max !== null ? classification.max + 1 : Infinity,
      }
    })

  return (
    <>
      <FlexWrapper style={{ marginBottom: '2em' }}>
        <ResponsiveSection>
          <ShortTandemRepeatAttributes shortTandemRepeat={shortTandemRepeat} />
        </ResponsiveSection>
        {shortTandemRepeat.stripy_id && (
          <ResponsiveSection>
            <h2>External Resources</h2>
            <List>
              <ListItem>
                <ExternalLink href={`https://stripy.org/database/${shortTandemRepeat.stripy_id}`}>
                  STRipy
                </ExternalLink>
              </ListItem>
            </List>
          </ResponsiveSection>
        )}
      </FlexWrapper>

      <section style={{ marginBottom: '2em' }}>
        <h2>Associated Diseases</h2>
        <TableWrapper>
          <BaseTable style={{ minWidth: '100%' }}>
            <thead>
              <tr>
                <th scope="col">Disease</th>
                <th scope="col">OMIM</th>
                <th scope="col">Inheritance</th>
                <th scope="col">Ranges of repeats</th>
              </tr>
            </thead>
            <tbody>
              {shortTandemRepeat.associated_diseases.map(disease => {
                return (
                  <tr key={disease.name}>
                    <th scope="row">{disease.name}</th>
                    <td>
                      {disease.omim_id && (
                        <ExternalLink href={`https://omim.org/entry/${disease.omim_id}`}>
                          {disease.omim_id}
                        </ExternalLink>
                      )}
                    </td>
                    <td>{disease.inheritance_mode}</td>
                    <td>
                      {disease.repeat_size_classifications
                        .map(classification => {
                          if (classification.min === null) {
                            return `${classification.classification} ≤ ${classification.max}`
                          }
                          if (classification.max === null) {
                            return `${classification.classification} ≥ ${classification.min}`
                          }
                          return `${classification.classification} ${classification.min} - ${classification.max}`
                        })
                        .join(', ')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </BaseTable>
        </TableWrapper>
      </section>

      <h2>Allele Size Distribution</h2>
      <ShortTandemRepeatAlleleSizeDistributionPlot
        maxRepeats={
          shortTandemRepeat.allele_size_distribution.distribution[
            shortTandemRepeat.allele_size_distribution.distribution.length - 1
          ][0]
        }
        alleleSizeDistribution={getAlleleSizeDistribution({
          shortTandemRepeat,
          selectedPopulationId,
          selectedRepeatUnit,
        })}
        repeatUnitLength={
          selectedRepeatUnit && !selectedRepeatUnit.startsWith('classification')
            ? selectedRepeatUnit.length
            : null
        }
        ranges={
          selectedRepeatUnit === '' ||
          selectedRepeatUnit === 'classification/pathogenic' ||
          (repeatUnitsByClassification.pathogenic || []).includes(selectedRepeatUnit)
            ? plotRanges
            : []
        }
        scaleType={selectedScaleType}
      />
      <ControlSection>
        <ShortTandemRepeatPopulationOptions
          id={`${shortTandemRepeat.id}-repeat-counts`}
          populationIds={populationIds}
          selectedPopulationId={selectedPopulationId}
          onSelectPopulationId={setSelectedPopulationId}
        />

        <label htmlFor={`short-tandem-repeat-${shortTandemRepeat.id}-repeat-unit`}>
          Repeat unit:{' '}
          <Select
            id={`short-tandem-repeat-${shortTandemRepeat.id}-repeat-unit`}
            value={selectedRepeatUnit}
            onChange={e => {
              setSelectedRepeatUnit(e.target.value)
            }}
          >
            {shortTandemRepeat.repeat_units.length === 1 ? (
              <>
                {shortTandemRepeat.repeat_units.map(repeatUnit => (
                  <option key={repeatUnit.repeat_unit} value={repeatUnit.repeat_unit}>
                    {repeatUnit.repeat_unit}
                  </option>
                ))}
              </>
            ) : (
              <>
                <option value="">All</option>
                {Object.keys(repeatUnitsByClassification).length > 1 && (
                  <optgroup label="By classification">
                    {['pathogenic', 'benign', 'unknown']
                      .filter(classification => repeatUnitsByClassification[classification])
                      .map(classification => (
                        <option key={classification} value={`classification/${classification}`}>
                          All {classification}
                        </option>
                      ))}
                  </optgroup>
                )}
                <optgroup label="Individual">
                  {shortTandemRepeat.repeat_units.map(repeatUnit => (
                    <option key={repeatUnit.repeat_unit} value={repeatUnit.repeat_unit}>
                      {repeatUnit.repeat_unit}
                    </option>
                  ))}
                </optgroup>
              </>
            )}
          </Select>
        </label>

        <label
          htmlFor={`short-tandem-repeat-${shortTandemRepeat.id}-allele-size-distribution-scale`}
        >
          Scale:{' '}
          <Select
            id={`short-tandem-repeat-${shortTandemRepeat.id}-allele-size-distribution-scale`}
            value={selectedScaleType}
            onChange={e => {
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
            <Select
              id={`short-tandem-repeat-${shortTandemRepeat.id}-allele-size-distribution-selected-disease`}
              value={selectedDisease}
              onChange={e => {
                setSelectedDisease(e.target.value)
              }}
            >
              {shortTandemRepeat.associated_diseases.map(disease => {
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

      <h2>Genotype Distribution</h2>
      <ShortTandemRepeatGenotypeDistributionPlot
        maxRepeats={[
          max(shortTandemRepeat.genotype_distribution.distribution, d => d[0]),
          max(shortTandemRepeat.genotype_distribution.distribution, d => d[1]),
        ]}
        genotypeDistribution={
          // eslint-disable-next-line no-nested-ternary
          selectedPopulationId === ''
            ? selectedGenotypeDistributionRepeatUnits
              ? shortTandemRepeat.genotype_distribution.repeat_units.find(
                  repeatUnit =>
                    repeatUnit.repeat_units.join(' / ') === selectedGenotypeDistributionRepeatUnits
                ).distribution
              : shortTandemRepeat.genotype_distribution.distribution
            : (selectedGenotypeDistributionRepeatUnits
                ? shortTandemRepeat.genotype_distribution.repeat_units.find(
                    repeatUnit =>
                      repeatUnit.repeat_units.join(' / ') ===
                      selectedGenotypeDistributionRepeatUnits
                  )
                : shortTandemRepeat.genotype_distribution
              ).populations.find(pop => pop.id === selectedPopulationId).distribution
        }
        xRanges={
          selectedGenotypeDistributionRepeatUnits === '' ||
          (repeatUnitsByClassification.pathogenic || []).includes(
            selectedGenotypeDistributionRepeatUnits.split(' / ')[0]
          )
            ? plotRanges
            : []
        }
        yRanges={
          selectedGenotypeDistributionRepeatUnits === '' ||
          (repeatUnitsByClassification.pathogenic || []).includes(
            selectedGenotypeDistributionRepeatUnits.split(' / ')[1]
          )
            ? plotRanges
            : []
        }
      />

      <ControlSection>
        <ShortTandemRepeatPopulationOptions
          id={`${shortTandemRepeat.id}-genotype-distribution`}
          populationIds={populationIds}
          selectedPopulationId={selectedPopulationId}
          onSelectPopulationId={setSelectedPopulationId}
        />

        <label
          htmlFor={`short-tandem-repeat-${shortTandemRepeat.id}-genotype-distribution-repeat-units`}
        >
          Repeat units:{' '}
          <Select
            id={`short-tandem-repeat-${shortTandemRepeat.id}-genotype-distribution-repeat-units`}
            value={selectedGenotypeDistributionRepeatUnits}
            onChange={e => {
              setSelectedGenotypeDistributionRepeatUnits(e.target.value)
            }}
          >
            {shortTandemRepeat.genotype_distribution.repeat_units.length > 1 && (
              <option value="">All</option>
            )}
            {shortTandemRepeat.genotype_distribution.repeat_units.map(repeatUnit => {
              const value = repeatUnit.repeat_units.join(' / ')
              return (
                <option key={value} value={value}>
                  {value}
                </option>
              )
            })}
          </Select>
        </label>
      </ControlSection>

      {shortTandemRepeat.associated_diseases.length > 1 && (
        <ControlSection style={{ marginTop: '1em' }}>
          <label
            htmlFor={`short-tandem-repeat-${shortTandemRepeat.id}-genotype-distribution-selected-disease`}
          >
            Show ranges for{' '}
            <Select
              id={`short-tandem-repeat-${shortTandemRepeat.id}-genotype-distribution-selected-disease`}
              value={selectedDisease}
              onChange={e => {
                setSelectedDisease(e.target.value)
              }}
            >
              {shortTandemRepeat.associated_diseases.map(disease => {
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

      {shortTandemRepeat.adjacent_repeats.length > 0 && (
        <section style={{ marginTop: '2em' }}>
          <h2>Adjacent Repeats</h2>
          {shortTandemRepeat.adjacent_repeats.map(adjacentRepeat => {
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
          })}
        </section>
      )}

      <section style={{ marginTop: '2em' }}>
        <h2>Read Data</h2>
        <Button
          onClick={() => {
            setIsReadDataModalOpen(true)
          }}
        >
          View read data
        </Button>
      </section>

      {isReadDataModalOpen && (
        <Modal
          initialFocusOnButton={false}
          onRequestClose={() => {
            setIsReadDataModalOpen(false)
          }}
          size="xlarge"
          title={`${shortTandemRepeat.id} Read Data`}
        >
          <ShortTandemRepeatReads
            datasetId={datasetId}
            shortTandemRepeat={shortTandemRepeat}
            initialFilter={{
              ...parseCombinedPopulationId(selectedPopulationId),
            }}
          />
        </Modal>
      )}
    </>
  )
}

ShortTandemRepeatPage.propTypes = {
  datasetId: PropTypes.string.isRequired,
  shortTandemRepeat: ShortTandemRepeatPropType.isRequired,
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

const ShortTandemRepeatPageContainer = ({ datasetId, strId }) => {
  return (
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
        success={data => data.short_tandem_repeat}
      >
        {({ data }) => {
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

ShortTandemRepeatPageContainer.propTypes = {
  datasetId: PropTypes.string.isRequired,
  strId: PropTypes.string.isRequired,
}

export default ShortTandemRepeatPageContainer