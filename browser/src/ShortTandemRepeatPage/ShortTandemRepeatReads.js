import PropTypes from 'prop-types'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'

import { Button, Input } from '@gnomad/ui'

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

export default ShortTandemRepeatReads
