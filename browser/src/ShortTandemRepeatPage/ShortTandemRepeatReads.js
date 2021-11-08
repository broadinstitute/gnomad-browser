import PropTypes from 'prop-types'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'

import { Button, Input, Select } from '@gnomad/ui'

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
          {read.alleles[0].repeat_unit} repeated {read.alleles[0].repeats} times with a{' '}
          {read.alleles[0].repeats_confidence_interval.lower}-
          {read.alleles[0].repeats_confidence_interval.upper} confidence interval
        </AttributeList.Item>
        <AttributeList.Item label="Allele 2">
          {read.alleles[1].repeat_unit} repeated {read.alleles[1].repeats} times with a{' '}
          {read.alleles[1].repeats_confidence_interval.lower}-
          {read.alleles[1].repeats_confidence_interval.upper} confidence interval
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

const ShortTandemRepeatReadContainer = ({ fetchRead, readIndex }) => {
  const fetchReadMemoized = useCallback(() => fetchRead(readIndex), [fetchRead, readIndex])
  const { isLoading, response: read, error } = useRequest(fetchReadMemoized)

  if (isLoading) {
    return (
      <Delayed>
        <StatusMessage>Loading read...</StatusMessage>
      </Delayed>
    )
  }

  if (error) {
    return <StatusMessage>Unable to load read</StatusMessage>
  }

  return <ShortTandemRepeatRead read={read} />
}

ShortTandemRepeatReadContainer.propTypes = {
  fetchRead: PropTypes.func.isRequired,
  readIndex: PropTypes.number.isRequired,
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

const ShortTandemRepeatReads = ({ datasetId, shortTandemRepeat, filter }) => {
  const fetchNumReadsMemoized = useCallback(
    () => fetchNumReads({ datasetId, shortTandemRepeatId: shortTandemRepeat.id, filter }),
    [datasetId, shortTandemRepeat, filter]
  )
  const { isLoading, response: numReads, error } = useRequest(fetchNumReadsMemoized)

  const readsStore = useRef(new Map())
  const [readIndex, setReadIndex] = useState(0)

  useEffect(() => {
    readsStore.current.clear()
    setReadIndex(0)
  }, [shortTandemRepeat, filter])

  const fetchRead = useMemo(() => {
    let timer = null
    return readIndexToFetch => {
      const storedRead = readsStore.current.get(readIndexToFetch)
      if (storedRead) {
        return Promise.resolve(storedRead)
      }

      const numReadsToFetch = 50
      return new Promise((resolve, reject) => {
        clearTimeout(timer)
        timer = setTimeout(() => {
          const readsPromise = fetchReads({
            datasetId,
            shortTandemRepeatId: shortTandemRepeat.id,
            filter,
            limit: numReadsToFetch,
            offset: readIndexToFetch,
          }).then(null, reject)

          Array.from(new Array(numReadsToFetch)).forEach((_, i) => {
            readsStore.current.set(
              readIndexToFetch + i,
              readsPromise.then(fetchedReads => {
                const read = i < fetchedReads.length ? fetchedReads[i] : null
                readsStore.current.set(readIndexToFetch + i, read)
                return read
              })
            )
          })

          resolve(readsStore.current.get(readIndexToFetch))
        }, 150)
      })
    }
  }, [datasetId, shortTandemRepeat, filter])

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
      <ControlSection style={{ marginBottom: '1em' }}>
        <Button
          onClick={() => {
            if (readIndex > 0) {
              setReadIndex(previousReadIndex => previousReadIndex - 1)
            }
          }}
        >
          Previous sample
        </Button>
        <span>
          Showing sample{' '}
          <Input
            type="number"
            value={readIndex + 1}
            min={1}
            max={numReads}
            onChange={e => {
              setReadIndex(Math.max(0, Math.min(numReads - 1, Number(e.target.value) - 1)))
            }}
            style={{ width: '10ch' }}
          />{' '}
          of {numReads.toLocaleString()}
        </span>

        <Button
          onClick={() => {
            if (readIndex < numReads - 1) {
              setReadIndex(previousReadIndex => previousReadIndex + 1)
            }
          }}
        >
          Next sample
        </Button>
      </ControlSection>

      <div style={{ minHeight: 800 }}>
        <ShortTandemRepeatReadContainer fetchRead={fetchRead} readIndex={readIndex} />
      </div>
    </>
  )
}

ShortTandemRepeatReads.propTypes = {
  datasetId: PropTypes.string.isRequired,
  shortTandemRepeat: ShortTandemRepeatPropType.isRequired,
  filter: PropTypes.shape({
    population: PropTypes.string,
    sex: PropTypes.string,
    alleles: PropTypes.arrayOf(
      PropTypes.shape({
        repeat_unit: PropTypes.string,
        min_repeats: PropTypes.number,
        max_repeat: PropTypes.number,
      })
    ),
  }).isRequired,
}

const ShortTandemRepeatReadsAllelesFilterControlsWrapper = styled.div`
  margin-bottom: 1em;
`

const ShortTandemRepeatReadsAllelesFilterControlWrapper = styled.div`
  margin-bottom: 0.5em;

  input {
    display: inline-block;
    width: 12ch;
  }
`

const ShortTandemRepeatReadsAllelesFilterControls = ({ shortTandemRepeat, value, onChange }) => {
  const maxNumRepeats =
    shortTandemRepeat.allele_size_distribution.distribution[
      shortTandemRepeat.allele_size_distribution.distribution.length - 1
    ][0]

  return (
    <ShortTandemRepeatReadsAllelesFilterControlsWrapper>
      {[0, 1].map(alleleIndex => (
        <ShortTandemRepeatReadsAllelesFilterControlWrapper key={`${alleleIndex}`}>
          Allele {alleleIndex + 1}: {/* eslint-disable jsx-a11y/label-has-associated-control */}
          <label htmlFor={`short-tandem-repeat-reads-filter-allele-${alleleIndex}-repeat-unit`}>
            Repeat unit{' '}
            <Select
              id={`short-tandem-repeat-reads-filter-allele-${alleleIndex}-repeat-unit`}
              value={value[alleleIndex].repeat_unit || ''}
              onChange={e => {
                const newRepeatUnit = e.target.value
                onChange(
                  value.map((v, i) =>
                    i === alleleIndex ? { ...v, repeat_unit: newRepeatUnit } : v
                  )
                )
              }}
            >
              <option value="">Any</option>
              {shortTandemRepeat.repeat_units.map(repeatUnit => (
                <option key={repeatUnit.repeat_unit} value={repeatUnit.repeat_unit}>
                  {repeatUnit.repeat_unit}
                </option>
              ))}
            </Select>
          </label>{' '}
          <label htmlFor={`short-tandem-repeat-reads-filter-allele-${alleleIndex}-min-repeats`}>
            Min repeats{' '}
            <Input
              type="number"
              id={`short-tandem-repeat-reads-filter-allele-${alleleIndex}-min-repeats`}
              min={0}
              max={maxNumRepeats}
              value={value[alleleIndex].min_repeats}
              onChange={e => {
                const newMinRepeats = Math.max(Math.min(Number(e.target.value), maxNumRepeats), 0)
                onChange(
                  value.map((v, i) =>
                    i === alleleIndex ? { ...v, min_repeats: newMinRepeats } : v
                  )
                )
              }}
            />
          </label>{' '}
          <label htmlFor={`short-tandem-repeat-reads-filter-allele-${alleleIndex}-max-repeats`}>
            Max repeats{' '}
            <Input
              type="number"
              id={`short-tandem-repeat-reads-filter-allele-${alleleIndex}-max-repeats`}
              min={0}
              max={maxNumRepeats}
              value={value[alleleIndex].max_repeats}
              onChange={e => {
                const newMaxRepeats = Math.max(Math.min(Number(e.target.value), maxNumRepeats), 0)
                onChange(
                  value.map((v, i) =>
                    i === alleleIndex ? { ...v, max_repeats: newMaxRepeats } : v
                  )
                )
              }}
            />
          </label>
          {/* eslint-enable jsx-a11y/label-has-associated-control */}
        </ShortTandemRepeatReadsAllelesFilterControlWrapper>
      ))}
    </ShortTandemRepeatReadsAllelesFilterControlsWrapper>
  )
}

ShortTandemRepeatReadsAllelesFilterControls.propTypes = {
  shortTandemRepeat: ShortTandemRepeatPropType.isRequired,
  value: PropTypes.arrayOf(
    PropTypes.shape({
      repeat_unit: PropTypes.string,
      min_repeats: PropTypes.number,
      max_repeats: PropTypes.number,
    })
  ).isRequired,
  onChange: PropTypes.func.isRequired,
}

const ShortTandemRepeatReadsContainer = ({ datasetId, shortTandemRepeat, filter: baseFilter }) => {
  const maxNumRepeats =
    shortTandemRepeat.allele_size_distribution.distribution[
      shortTandemRepeat.allele_size_distribution.distribution.length - 1
    ][0]

  const [filter, setFilter] = useState({
    ...baseFilter,
    alleles: [
      {
        repeat_unit: null,
        min_repeats: 0,
        max_repeats: maxNumRepeats,
      },
      {
        repeat_unit: null,
        min_repeats: 0,
        max_repeats: maxNumRepeats,
      },
    ],
  })

  if (baseFilter.population !== filter.population || baseFilter.sex !== filter.sex) {
    setFilter({
      ...filter,
      ...baseFilter,
    })
  }

  return (
    <>
      <ShortTandemRepeatReadsAllelesFilterControls
        shortTandemRepeat={shortTandemRepeat}
        value={filter.alleles}
        onChange={newAllelesFilter => {
          setFilter(prevFilter => ({ ...prevFilter, alleles: newAllelesFilter }))
        }}
      />
      <ShortTandemRepeatReads
        datasetId={datasetId}
        shortTandemRepeat={shortTandemRepeat}
        filter={filter}
      />
    </>
  )
}

ShortTandemRepeatReadsContainer.propTypes = {
  datasetId: PropTypes.string.isRequired,
  shortTandemRepeat: ShortTandemRepeatPropType.isRequired,
  filter: PropTypes.shape({
    population: PropTypes.string,
    sex: PropTypes.string,
    alleles: PropTypes.arrayOf(
      PropTypes.shape({
        repeat_unit: PropTypes.string,
        min_repeats: PropTypes.number,
        max_repeats: PropTypes.number,
      })
    ),
  }).isRequired,
}

export default ShortTandemRepeatReadsContainer
