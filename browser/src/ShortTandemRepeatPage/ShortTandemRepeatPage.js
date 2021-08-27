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
  const [selectedPopulationId, setSelectedPopulationId] = useState('')
  const [selectedScaleType, setSelectedScaleType] = useState('linear')

  const populationIds = shortTandemRepeat.populations.map(pop => pop.id)

  return (
    <>
      <FlexWrapper style={{ marginBottom: '2em' }}>
        <ResponsiveSection>
          <ShortTandemRepeatAttributes shortTandemRepeat={shortTandemRepeat} />
        </ResponsiveSection>
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
      </FlexWrapper>

      <ShortTandemRepeatRepeatCountsPlot
        maxRepeats={shortTandemRepeat.repeats[shortTandemRepeat.repeats.length - 1][0]}
        repeats={
          selectedPopulationId === ''
            ? shortTandemRepeat.repeats
            : shortTandemRepeat.populations.find(pop => pop.id === selectedPopulationId).repeats
        }
        shortTandemRepeat={shortTandemRepeat}
        thresholds={[
          {
            label: 'Normal threshold',
            value: shortTandemRepeat.associated_disease.normal_threshold + 1,
          },
          {
            label: 'Pathogenic threshold',
            value: shortTandemRepeat.associated_disease.pathogenic_threshold,
          },
          {
            label: 'Read length (150 bp)',
            value: Math.floor(150 / shortTandemRepeat.repeat_unit.length) + 1,
          },
        ]}
        scaleType={selectedScaleType}
      />
      <FlexWrapper>
        <ShortTandemRepeatPopulationOptions
          id={shortTandemRepeat.id}
          populationIds={populationIds}
          selectedPopulationId={selectedPopulationId}
          onSelectPopulationId={setSelectedPopulationId}
        />
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
                      ? adjacentRepeat.repeats
                      : adjacentRepeat.populations.find(pop => pop.id === selectedPopulationId)
                          .repeats
                  }
                  thresholds={[
                    {
                      label: 'Read length (150 bp)',
                      value: Math.floor(150 / adjacentRepeat.repeat_unit.length) + 1,
                    },
                  ]}
                  scaleType={selectedScaleType}
                />
                <FlexWrapper>
                  <ShortTandemRepeatPopulationOptions
                    id={adjacentRepeat.id}
                    populationIds={populationIds}
                    selectedPopulationId={selectedPopulationId}
                    onSelectPopulationId={setSelectedPopulationId}
                  />
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
    repeat_unit
    repeats
    populations {
      id
      repeats
    }
    stripy_id
    adjacent_repeats {
      id
      reference_region {
        chrom
        start
        stop
      }
      repeat_unit
      repeats
      populations {
        id
        repeats
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
