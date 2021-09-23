import PropTypes from 'prop-types'
import React, { useState } from 'react'
import styled from 'styled-components'

import { ExternalLink, List, ListItem, Page, Select } from '@gnomad/ui'

import { labelForDataset } from '../datasets'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import Query from '../Query'

import ShortTandemRepeatAttributes from './ShortTandemRepeatAttributes'
import ShortTandemRepeatPopulationOptions from './ShortTandemRepeatPopulationOptions'
import { ShortTandemRepeatPropType } from './ShortTandemRepeatPropTypes'
import ShortTandemRepeatRepeatCountsPlot from './ShortTandemRepeatRepeatCountsPlot'
import ShortTandemRepeatAdjacentRepeatAttributes from './ShortTandemRepeatAdjacentRepeatAttributes'

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

const ShortTandemRepeatPage = ({ shortTandemRepeat }) => {
  const [selectedRepeatUnit, setSelectedRepeatUnit] = useState(
    shortTandemRepeat.repeat_units.length === 1 ? shortTandemRepeat.repeat_units[0].repeat_unit : ''
  )
  const [selectedAdjacentRepeatRepeatUnits, setSelectedAdjacentRepeatRepeatUnits] = useState(
    shortTandemRepeat.adjacent_repeats.reduce(
      (acc, adjacentRepeat) => ({
        [adjacentRepeat.id]:
          adjacentRepeat.repeat_units.length === 1
            ? adjacentRepeat.repeat_units[0].repeat_unit
            : '',
      }),
      {}
    )
  )

  const [selectedPopulationId, setSelectedPopulationId] = useState('')
  const [selectedScaleType, setSelectedScaleType] = useState('linear')

  const populationIds = shortTandemRepeat.populations.map(pop => pop.id)

  const plotThresholds = []
  if (shortTandemRepeat.associated_disease.normal_threshold !== null) {
    plotThresholds.push({
      label: 'Normal threshold',
      value: shortTandemRepeat.associated_disease.normal_threshold + 1,
    })
  }
  if (shortTandemRepeat.associated_disease.pathogenic_threshold !== null) {
    plotThresholds.push({
      label: 'Pathogenic threshold',
      value: shortTandemRepeat.associated_disease.pathogenic_threshold,
    })
  }

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

      <ShortTandemRepeatRepeatCountsPlot
        maxRepeats={shortTandemRepeat.repeats[shortTandemRepeat.repeats.length - 1][0]}
        repeats={
          selectedPopulationId === ''
            ? (selectedRepeatUnit
                ? shortTandemRepeat.repeat_units.find(
                    repeatUnit => repeatUnit.repeat_unit === selectedRepeatUnit
                  )
                : shortTandemRepeat
              ).repeats
            : (selectedRepeatUnit
                ? shortTandemRepeat.repeat_units.find(
                    repeatUnit => repeatUnit.repeat_unit === selectedRepeatUnit
                  )
                : shortTandemRepeat
              ).populations.find(pop => pop.id === selectedPopulationId).repeats
        }
        repeatUnit={selectedRepeatUnit || shortTandemRepeat.reference_repeat_unit}
        thresholds={plotThresholds}
        scaleType={selectedScaleType}
      />
      <FlexWrapper>
        <ShortTandemRepeatPopulationOptions
          id={shortTandemRepeat.id}
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
            <option value="" disabled={shortTandemRepeat.repeat_units.length === 1}>
              All
            </option>
            {shortTandemRepeat.repeat_units.map(repeatUnit => (
              <option key={repeatUnit.repeat_unit} value={repeatUnit.repeat_unit}>
                {repeatUnit.repeat_unit}
              </option>
            ))}
          </Select>
        </label>

        <label htmlFor={`short-tandem-repeat-${shortTandemRepeat.id}-repeat-counts-scale`}>
          Scale:{' '}
          <Select
            id={`short-tandem-repeat-${shortTandemRepeat.id}-repeat-counts-scale`}
            value={selectedScaleType}
            onChange={e => {
              setSelectedScaleType(e.target.value)
            }}
          >
            <option value="linear">Linear</option>
            <option value="log">Log</option>
          </Select>
        </label>
      </FlexWrapper>

      {shortTandemRepeat.adjacent_repeats.length > 0 && (
        <section style={{ marginTop: '2em' }}>
          <h2>Adjacent Repeats</h2>
          {shortTandemRepeat.adjacent_repeats.map(adjacentRepeat => {
            return (
              <section key={adjacentRepeat.id} style={{ marginBottom: '2em' }}>
                <h3>{adjacentRepeat.id}</h3>
                <ShortTandemRepeatAdjacentRepeatAttributes adjacentRepeat={adjacentRepeat} />
                <ShortTandemRepeatRepeatCountsPlot
                  maxRepeats={adjacentRepeat.repeats[adjacentRepeat.repeats.length - 1][0]}
                  repeats={
                    selectedPopulationId === ''
                      ? (selectedAdjacentRepeatRepeatUnits[adjacentRepeat.id]
                          ? adjacentRepeat.repeat_units.find(
                              repeatUnit =>
                                repeatUnit.repeat_unit ===
                                selectedAdjacentRepeatRepeatUnits[adjacentRepeat.id]
                            )
                          : adjacentRepeat
                        ).repeats
                      : (selectedAdjacentRepeatRepeatUnits[adjacentRepeat.id]
                          ? adjacentRepeat.repeat_units.find(
                              repeatUnit =>
                                repeatUnit.repeat_unit ===
                                selectedAdjacentRepeatRepeatUnits[adjacentRepeat.id]
                            )
                          : adjacentRepeat
                        ).populations.find(pop => pop.id === selectedPopulationId).repeats
                  }
                  repeatUnit={
                    selectedAdjacentRepeatRepeatUnits[adjacentRepeat.id] ||
                    adjacentRepeat.reference_repeat_unit
                  }
                  scaleType={selectedScaleType}
                />
                <FlexWrapper>
                  <ShortTandemRepeatPopulationOptions
                    id={adjacentRepeat.id}
                    populationIds={populationIds}
                    selectedPopulationId={selectedPopulationId}
                    onSelectPopulationId={setSelectedPopulationId}
                  />

                  <label htmlFor={`short-tandem-repeat-${adjacentRepeat.id}-repeat-unit`}>
                    Repeat unit:{' '}
                    <Select
                      id={`short-tandem-repeat-${adjacentRepeat.id}-repeat-unit`}
                      value={selectedAdjacentRepeatRepeatUnits[adjacentRepeat.id]}
                      onChange={e => {
                        setSelectedAdjacentRepeatRepeatUnits(
                          prevSelectedAdjacentRepeatRepeatUnits => ({
                            ...prevSelectedAdjacentRepeatRepeatUnits,
                            [adjacentRepeat.id]: e.target.value,
                          })
                        )
                      }}
                    >
                      <option value="" disabled={adjacentRepeat.repeat_units.length === 1}>
                        All
                      </option>
                      {adjacentRepeat.repeat_units.map(repeatUnit => (
                        <option key={repeatUnit.repeat_unit} value={repeatUnit.repeat_unit}>
                          {repeatUnit.repeat_unit}
                        </option>
                      ))}
                    </Select>
                  </label>

                  <label htmlFor={`short-tandem-repeat-${adjacentRepeat.id}-repeat-counts-scale`}>
                    Scale:{' '}
                    <Select
                      id={`short-tandem-repeat-${adjacentRepeat.id}-repeat-counts-scale`}
                      value={selectedScaleType}
                      onChange={e => {
                        setSelectedScaleType(e.target.value)
                      }}
                    >
                      <option value="linear">Linear</option>
                      <option value="log">Log</option>
                    </Select>
                  </label>
                </FlexWrapper>
              </section>
            )
          })}
        </section>
      )}
    </>
  )
}

ShortTandemRepeatPage.propTypes = {
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
    inheritance_mode
    associated_disease {
      name
      omim_id
      normal_threshold
      pathogenic_threshold
    }
    reference_region {
      chrom
      start
      stop
    }
    reference_repeat_unit
    repeats
    populations {
      id
      repeats
    }
    repeat_units {
      repeat_unit
      classification
      repeats
      populations {
        id
        repeats
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
      repeats
      populations {
        id
        repeats
      }
      repeat_units {
        repeat_unit
        repeats
        populations {
          id
          repeats
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
        Short Tandem Repeat: {strId}
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
          return <ShortTandemRepeatPage shortTandemRepeat={data.short_tandem_repeat} />
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
