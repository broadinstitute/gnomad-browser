import PropTypes from 'prop-types'
import React, { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'

import { Button, Input, PrimaryButton, Select } from '@gnomad/ui'

import { GNOMAD_POPULATION_NAMES } from '@gnomad/dataset-metadata/gnomadPopulations'

import AttributeList from '../AttributeList'
import Delayed from '../Delayed'
import StatusMessage from '../StatusMessage'
import useRequest from '../useRequest'
import ControlSection from '../VariantPage/ControlSection'

import { ShortTandemRepeatPropType } from './ShortTandemRepeatPropTypes'

const ShortTandemRepeatReadImageWrapper = styled.div`
  overflow-x: auto;
  width: 100%;
`

const ShortTandemRepeatReadImage = styled.img`
  display: block;
`

const ShortTandemRepeatRead = ({ read }) => {
  return (
    <div>
      <AttributeList style={{ marginBottom: '1em' }}>
        <AttributeList.Item label="Population">
          {GNOMAD_POPULATION_NAMES[read.population]}
        </AttributeList.Item>
        <AttributeList.Item label="Sex">{read.sex}</AttributeList.Item>
        <AttributeList.Item label="Allele 1">
          {read.alleles[0].repeat_unit} repeated {read.alleles[0].repeats} (
          {read.alleles[0].repeats_confidence_interval.lower}-
          {read.alleles[0].repeats_confidence_interval.upper}) times
        </AttributeList.Item>
        <AttributeList.Item label="Allele 2">
          {read.alleles[1].repeat_unit} repeated {read.alleles[1].repeats} (
          {read.alleles[1].repeats_confidence_interval.lower}-
          {read.alleles[1].repeats_confidence_interval.upper}) times
        </AttributeList.Item>
      </AttributeList>
      <ShortTandemRepeatReadImageWrapper>
        <ShortTandemRepeatReadImage alt="Reads for short tandem repeat" src={read.path} />
      </ShortTandemRepeatReadImageWrapper>
    </div>
  )
}

ShortTandemRepeatRead.propTypes = {
  read: PropTypes.shape({
    alleles: PropTypes.arrayOf(
      PropTypes.shape({
        repeat_unit: PropTypes.string.isRequired,
        repeats: PropTypes.number.isRequired,
        repeats_confidence_interval: PropTypes.shape({
          upper: PropTypes.number.isRequired,
          lower: PropTypes.number.isRequired,
        }).isRequired,
      })
    ).isRequired,
    population: PropTypes.string.isRequired,
    sex: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
  }).isRequired,
}

const ShortTandemRepeatsReadFilterPropType = PropTypes.shape({
  population: PropTypes.string,
  sex: PropTypes.string,
  alleles: PropTypes.arrayOf(
    PropTypes.shape({
      repeat_unit: PropTypes.string,
      min_repeats: PropTypes.number,
      max_repeat: PropTypes.number,
    })
  ),
})

const fetchReads = ({ datasetId, shortTandemRepeatId, filter, limit, offset }) => {
  return fetch('/reads/', {
    body: JSON.stringify({
      query: `
        query GetShortTandemRepeatNumReads($shortTandemRepeatId: String!, $datasetId: DatasetId!, $filter: ShortTandemRepeatReadsFilter, $limit: Int, $offset: Int) {
          short_tandem_repeat_reads(id: $shortTandemRepeatId, dataset: $datasetId, filter: $filter) {
            reads(limit: $limit, offset: $offset) {
              alleles {
                repeat_unit
                repeats
                repeats_confidence_interval {
                  upper
                  lower
                }
              }
              population
              sex
              path
            }
          }
        }
      `,
      variables: {
        datasetId,
        shortTandemRepeatId,
        filter,
        limit,
        offset,
      },
    }),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then(response => response.json())
    .then(response => response.data.short_tandem_repeat_reads.reads)
}

const ReadsList = styled.ul`
  padding: 0;
  margin: 0 0 1em;
  list-style-type: none;

  li {
    padding: 0.5em 0;
    border-bottom: 1px solid #e2e2e2;
  }
`

const ShortTandemRepeatReadsPage = ({
  datasetId,
  shortTandemRepeatId,
  filter,
  pageIndex,
  pageSize,
}) => {
  const fetchReadsMemoized = useCallback(
    () =>
      fetchReads({
        datasetId,
        shortTandemRepeatId,
        filter,
        limit: pageSize,
        offset: pageIndex * pageSize,
      }),
    [datasetId, shortTandemRepeatId, filter, pageSize, pageIndex]
  )
  const { isLoading, response: reads, error } = useRequest(fetchReadsMemoized)

  if (isLoading) {
    return (
      <Delayed>
        <StatusMessage>Loading read data...</StatusMessage>
      </Delayed>
    )
  }

  if (error) {
    return <StatusMessage>Unable to load read data</StatusMessage>
  }

  return (
    <ReadsList>
      {reads.map(read => (
        <li key={read.path}>
          <ShortTandemRepeatRead read={read} />
        </li>
      ))}
    </ReadsList>
  )
}

ShortTandemRepeatReadsPage.propTypes = {
  datasetId: PropTypes.string.isRequired,
  shortTandemRepeatId: PropTypes.string.isRequired,
  filter: ShortTandemRepeatsReadFilterPropType.isRequired,
  pageIndex: PropTypes.number.isRequired,
  pageSize: PropTypes.number.isRequired,
}

const fetchNumReads = ({ datasetId, shortTandemRepeatId, filter }) => {
  return fetch('/reads/', {
    body: JSON.stringify({
      query: `
        query GetShortTandemRepeatNumReads($shortTandemRepeatId: String!, $datasetId: DatasetId!, $filter: ShortTandemRepeatReadsFilter) {
          short_tandem_repeat_reads(id: $shortTandemRepeatId, dataset: $datasetId, filter: $filter) {
            num_reads
          }
        }
      `,
      variables: {
        datasetId,
        shortTandemRepeatId,
        filter,
      },
    }),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then(response => response.json())
    .then(response => response.data.short_tandem_repeat_reads.num_reads)
}

const ShortTandemRepeatReadsPages = ({ datasetId, shortTandemRepeatId, filter }) => {
  const fetchNumReadsMemoized = useCallback(
    () => fetchNumReads({ datasetId, shortTandemRepeatId, filter }),
    [datasetId, shortTandemRepeatId, filter]
  )
  const { isLoading, response: numReads, error } = useRequest(fetchNumReadsMemoized)

  const [pageIndex, setPageIndex] = useState(0)
  useEffect(() => {
    setPageIndex(0)
  }, [shortTandemRepeatId, filter])

  const pageSize = 5

  const numPages = Math.ceil(numReads / pageSize)

  if (isLoading) {
    return (
      <Delayed>
        <StatusMessage>Loading read data...</StatusMessage>
      </Delayed>
    )
  }

  if (error) {
    return <StatusMessage>Unable to load read data</StatusMessage>
  }

  return (
    <>
      <div style={{ minHeight: pageSize * 500 }}>
        <ShortTandemRepeatReadsPage
          datasetId={datasetId}
          shortTandemRepeatId={shortTandemRepeatId}
          filter={filter}
          pageIndex={pageIndex}
          pageSize={pageSize}
        />
      </div>
      <ControlSection>
        <Button
          onClick={() => {
            if (pageIndex > 0) {
              setPageIndex(previousPageIndex => previousPageIndex - 1)
            }
          }}
        >
          Previous page
        </Button>
        <span>
          Showing page{' '}
          <Input
            type="number"
            value={pageIndex + 1}
            min={1}
            max={numPages}
            onChange={e => {
              setPageIndex(Math.max(0, Math.min(numPages - 1, Number(e.target.value) - 1)))
            }}
            style={{ width: '10ch' }}
          />{' '}
          of {numPages.toLocaleString()}
        </span>

        <Button
          onClick={() => {
            if (pageIndex < numPages - 1) {
              setPageIndex(previousPageIndex => previousPageIndex + 1)
            }
          }}
        >
          Next page
        </Button>
      </ControlSection>
    </>
  )
}

ShortTandemRepeatReadsPages.propTypes = {
  datasetId: PropTypes.string.isRequired,
  shortTandemRepeatId: PropTypes.string.isRequired,
  filter: ShortTandemRepeatsReadFilterPropType.isRequired,
}

const SubmitButton = styled(PrimaryButton).attrs({ type: 'submit' })``

const ShortTandemRepeatReadsFilterControl = ({ defaultValue, value, onChange }) => {
  const [filter, setFilter] = useState(value)

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        onChange(filter)
      }}
      style={{ borderBottom: '1px solid #e2e2e2', marginBottom: '1em' }}
    >
      <div style={{ marginBottom: '1em' }}>
        <label htmlFor="short-tandem-repeat-reads-filter-population">
          Population:{' '}
          <Select
            id="short-tandem-repeat-reads-filter-population"
            value={filter.population || ''}
            onChange={e => {
              setFilter({
                ...filter,
                population: e.target.value || null,
              })
            }}
          >
            <option value="">Global</option>
            {Object.keys(GNOMAD_POPULATION_NAMES)
              .filter(popId => !popId.includes('_'))
              .sort((pop1Id, pop2Id) =>
                GNOMAD_POPULATION_NAMES[pop1Id].localeCompare(GNOMAD_POPULATION_NAMES[pop2Id])
              )
              .map(popId => (
                <option key={popId} value={popId}>
                  {GNOMAD_POPULATION_NAMES[popId]}
                </option>
              ))}
          </Select>
        </label>{' '}
        <label htmlFor="short-tandem-repeat-reads-filter-sex">
          Sex:{' '}
          <Select
            id="short-tandem-repeat-reads-filter-sex"
            value={filter.sex || ''}
            onChange={e => {
              setFilter({
                ...filter,
                sex: e.target.value || null,
              })
            }}
          >
            <option value="">All</option>
            <option value="XX">XX</option>
            <option value="XY">XY</option>
          </Select>
        </label>
      </div>
      <div style={{ marginBottom: '1em' }}>
        <SubmitButton>Apply</SubmitButton>{' '}
        <Button
          onClick={() => {
            setFilter(defaultValue)
            onChange(defaultValue)
          }}
        >
          Reset
        </Button>
      </div>
    </form>
  )
}

ShortTandemRepeatReadsFilterControl.propTypes = {
  defaultValue: ShortTandemRepeatsReadFilterPropType.isRequired,
  value: ShortTandemRepeatsReadFilterPropType.isRequired,
  onChange: PropTypes.func.isRequired,
}

const getFilterDescription = filter => {
  if (!filter.population && !filter.sex) {
    return 'all'
  }
  if (filter.population && !filter.sex) {
    return GNOMAD_POPULATION_NAMES[filter.population]
  }
  if (!filter.population && filter.sex) {
    return filter.sex
  }
  return `${GNOMAD_POPULATION_NAMES[filter.population]} ${filter.sex}`
}

const ShortTandemRepeatReads = ({ datasetId, shortTandemRepeat, initialFilter }) => {
  const [filter, setFilter] = useState(
    initialFilter || {
      population: null,
      sex: null,
      alleles: [],
    }
  )

  return (
    <>
      <p>Currently showing reads for {getFilterDescription(filter)} samples.</p>
      <h3>Select samples</h3>
      <ShortTandemRepeatReadsFilterControl
        defaultValue={
          initialFilter || {
            population: null,
            sex: null,
            alleles: [],
          }
        }
        value={filter}
        onChange={setFilter}
      />
      <ShortTandemRepeatReadsPages
        datasetId={datasetId}
        shortTandemRepeatId={shortTandemRepeat.id}
        filter={filter}
      />
    </>
  )
}

ShortTandemRepeatReads.propTypes = {
  datasetId: PropTypes.string.isRequired,
  shortTandemRepeat: ShortTandemRepeatPropType.isRequired,
  initialFilter: ShortTandemRepeatsReadFilterPropType,
}

ShortTandemRepeatReads.defaultProps = {
  initialFilter: undefined,
}

export default ShortTandemRepeatReads
