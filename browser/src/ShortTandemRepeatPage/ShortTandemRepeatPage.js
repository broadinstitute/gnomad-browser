import { max } from 'd3-array'
import PropTypes from 'prop-types'
import React, { useState } from 'react'
import styled from 'styled-components'

import { ExternalLink, List, ListItem, Page, Select } from '@gnomad/ui'

import { labelForDataset } from '../datasets'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import Query from '../Query'
import ControlSection from '../VariantPage/ControlSection'

import ShortTandemRepeatAdjacentRepeat from './ShortTandemRepeatAdjacentRepeat'
import ShortTandemRepeatAttributes from './ShortTandemRepeatAttributes'
import ShortTandemRepeatPopulationOptions from './ShortTandemRepeatPopulationOptions'
import { ShortTandemRepeatPropType } from './ShortTandemRepeatPropTypes'
import ShortTandemRepeatRepeatCountsPlot from './ShortTandemRepeatRepeatCountsPlot'
import ShortTandemRepeatRepeatCooccurrencePlot from './ShortTandemRepeatRepeatCooccurrencePlot'

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

const sumRepeats = repeats => {
  const nByKey = repeats.flat().reduce((acc, d) => {
    const key = d.slice(0, d.length - 1).join('/')
    return {
      ...acc,
      [key]: (acc[key] || 0) + d[d.length - 1],
    }
  }, {})
  return Object.entries(nByKey).map(([key, n]) => [...key.split('/').map(Number), n])
}

const getRepeatCountRepeats = ({ shortTandemRepeat, selectedRepeatUnit, selectedPopulationId }) => {
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

      const repeatUnits = shortTandemRepeat.repeat_counts.repeat_units.filter(
        r => repeatUnitClassification[r.repeat_unit] === selectedClassification
      )

      const repeats = repeatUnits.map(
        selectedPopulationId
          ? r => r.populations.find(pop => pop.id === selectedPopulationId).repeats
          : r => r.repeats
      )

      return sumRepeats(repeats)
    }

    const repeatUnit = shortTandemRepeat.repeat_counts.repeat_units.find(
      r => r.repeat_unit === selectedRepeatUnit
    )
    if (selectedPopulationId) {
      return repeatUnit.populations.find(pop => pop.id === selectedPopulationId).repeats
    }
    return repeatUnit.repeats
  }

  if (selectedPopulationId) {
    return shortTandemRepeat.repeat_counts.populations.find(pop => pop.id === selectedPopulationId)
      .repeats
  }

  return shortTandemRepeat.repeat_counts.total
}

const ShortTandemRepeatPage = ({ shortTandemRepeat }) => {
  const [selectedRepeatUnit, setSelectedRepeatUnit] = useState(
    shortTandemRepeat.repeat_units.length === 1 ? shortTandemRepeat.repeat_units[0].repeat_unit : ''
  )

  const [selectedPopulationId, setSelectedPopulationId] = useState('')
  const [selectedScaleType, setSelectedScaleType] = useState('linear')

  const [selectedCooccurrenceRepeatUnits, setSelectedCooccurrenceRepeatUnits] = useState(
    shortTandemRepeat.repeat_cooccurrence.repeat_units.length === 1
      ? shortTandemRepeat.repeat_cooccurrence.repeat_units[0].repeat_units.join(' / ')
      : ''
  )

  const populationIds = shortTandemRepeat.repeat_counts.populations.map(pop => pop.id)

  const repeatUnitsByClassification = {}
  shortTandemRepeat.repeat_units.forEach(repeatUnit => {
    if (repeatUnitsByClassification[repeatUnit.classification] === undefined) {
      repeatUnitsByClassification[repeatUnit.classification] = []
    }
    repeatUnitsByClassification[repeatUnit.classification].push(repeatUnit.repeat_unit)
  })

  const plotRanges = shortTandemRepeat.associated_disease.pathogenic_threshold
    ? [
        ...(shortTandemRepeat.associated_disease.normal_threshold !== null
          ? [
              {
                start: 0,
                stop: shortTandemRepeat.associated_disease.normal_threshold + 1,
                label: 'Normal',
              },
              {
                start: shortTandemRepeat.associated_disease.normal_threshold + 1,
                stop: shortTandemRepeat.associated_disease.pathogenic_threshold,
                label: 'Intermediate',
              },
            ]
          : [
              {
                start: 0,
                stop: shortTandemRepeat.associated_disease.pathogenic_threshold,
                label: 'Intermediate',
              },
            ]),
        {
          start: shortTandemRepeat.associated_disease.pathogenic_threshold,
          stop: Infinity,
          label: 'Pathogenic',
        },
      ]
    : []

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

      <h2>Repeat Counts</h2>
      <ShortTandemRepeatRepeatCountsPlot
        maxRepeats={
          shortTandemRepeat.repeat_counts.total[shortTandemRepeat.repeat_counts.total.length - 1][0]
        }
        repeats={getRepeatCountRepeats({
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
      </ControlSection>

      <h2>Repeat Count Co-occurrence</h2>
      <ShortTandemRepeatRepeatCooccurrencePlot
        maxRepeats={[
          max(shortTandemRepeat.repeat_cooccurrence.total, d => d[0]),
          max(shortTandemRepeat.repeat_cooccurrence.total, d => d[1]),
        ]}
        repeatCooccurrence={
          // eslint-disable-next-line no-nested-ternary
          selectedPopulationId === ''
            ? selectedCooccurrenceRepeatUnits
              ? shortTandemRepeat.repeat_cooccurrence.repeat_units.find(
                  repeatUnit =>
                    repeatUnit.repeat_units.join(' / ') === selectedCooccurrenceRepeatUnits
                ).repeats
              : shortTandemRepeat.repeat_cooccurrence.total
            : (selectedCooccurrenceRepeatUnits
                ? shortTandemRepeat.repeat_cooccurrence.repeat_units.find(
                    repeatUnit =>
                      repeatUnit.repeat_units.join(' / ') === selectedCooccurrenceRepeatUnits
                  )
                : shortTandemRepeat.repeat_cooccurrence
              ).populations.find(pop => pop.id === selectedPopulationId).repeats
        }
        xRanges={
          selectedCooccurrenceRepeatUnits === '' ||
          (repeatUnitsByClassification.pathogenic || []).includes(
            selectedCooccurrenceRepeatUnits.split(' / ')[0]
          )
            ? plotRanges
            : []
        }
        yRanges={
          selectedCooccurrenceRepeatUnits === '' ||
          (repeatUnitsByClassification.pathogenic || []).includes(
            selectedCooccurrenceRepeatUnits.split(' / ')[1]
          )
            ? plotRanges
            : []
        }
      />

      <ControlSection>
        <ShortTandemRepeatPopulationOptions
          id={`${shortTandemRepeat.id}-repeat-cooccurrence`}
          populationIds={populationIds}
          selectedPopulationId={selectedPopulationId}
          onSelectPopulationId={setSelectedPopulationId}
        />

        <label
          htmlFor={`short-tandem-repeat-${shortTandemRepeat.id}-repeat-cooccurrence-repeat-units`}
        >
          Repeat units:{' '}
          <Select
            id={`short-tandem-repeat-${shortTandemRepeat.id}-repeat-cooccurrence-repeat-units`}
            value={selectedCooccurrenceRepeatUnits}
            onChange={e => {
              setSelectedCooccurrenceRepeatUnits(e.target.value)
            }}
          >
            {shortTandemRepeat.repeat_cooccurrence.repeat_units.length > 1 && (
              <option value="">All</option>
            )}
            {shortTandemRepeat.repeat_cooccurrence.repeat_units.map(repeatUnit => {
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
    repeat_units {
      repeat_unit
      classification
    }
    repeat_counts {
      total
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
    repeat_cooccurrence {
      total
      populations {
        id
        repeats
      }
      repeat_units {
        repeat_units
        repeats
        populations {
          id
          repeats
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
      repeat_counts {
        total
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
      repeat_cooccurrence {
        total
        populations {
          id
          repeats
        }
        repeat_units {
          repeat_units
          repeats
          populations {
            id
            repeats
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
