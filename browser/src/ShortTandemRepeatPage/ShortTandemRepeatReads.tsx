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

type ShortTandemRepeatReadProps = {
  read: {
    alleles: {
      repeat_unit: string
      repeats: number
      repeats_confidence_interval: {
        upper: number
        lower: number
      }
    }[]
    population: string
    sex: string
    age?: string
    pcr_protocol: string
    path: string
  }
}

const ShortTandemRepeatRead = ({ read }: ShortTandemRepeatReadProps) => {
  return (
    <div>
      <AttributeList style={{ marginBottom: '1em' }}>
        {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
        <AttributeList.Item label="Population">
          {/* @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
          {GNOMAD_POPULATION_NAMES[read.population]}
        </AttributeList.Item>
        {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
        <AttributeList.Item label="Sex">{read.sex}</AttributeList.Item>
        {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
        <AttributeList.Item label="Age">
          {read.age || 'Not available for this sample'}
        </AttributeList.Item>
        {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
        <AttributeList.Item label="PCR protocol">
          {read.pcr_protocol.replace('pcr', 'PCR').split('_').join(' ')}
        </AttributeList.Item>
        {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
        <AttributeList.Item label="Allele 1">
          {read.alleles[0].repeat_unit} repeated {read.alleles[0].repeats} times with a{' '}
          {read.alleles[0].repeats_confidence_interval.lower}-
          {read.alleles[0].repeats_confidence_interval.upper} confidence interval
        </AttributeList.Item>
        {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
        <AttributeList.Item label="Allele 2">
          {read.alleles.length > 1 ? (
            <>
              {read.alleles[1].repeat_unit} repeated {read.alleles[1].repeats} times with a{' '}
              {read.alleles[1].repeats_confidence_interval.lower}-
              {read.alleles[1].repeats_confidence_interval.upper} confidence interval
            </>
          ) : (
            'None'
          )}
        </AttributeList.Item>
      </AttributeList>
      <ShortTandemRepeatReadImageWrapper>
        <a href={read.path} target="_blank" rel="noopener noreferrer">
          <ShortTandemRepeatReadImage alt="Reads for short tandem repeat" src={read.path} />
        </a>
      </ShortTandemRepeatReadImageWrapper>
    </div>
  )
}

type ShortTandemRepeatReadContainerProps = {
  fetchRead: (...args: any[]) => any
  readIndex: number
}

const ShortTandemRepeatReadContainer = ({
  fetchRead,
  readIndex,
}: ShortTandemRepeatReadContainerProps) => {
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

  // @ts-expect-error TS(2322) FIXME: Type 'null' is not assignable to type '{ alleles: ... Remove this comment to see the full error message
  return <ShortTandemRepeatRead read={read} />
}

const fetchNumReads = ({ datasetId, shortTandemRepeatId, filter }: any) => {
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
    .then((response) => response.json())
    .then((response) => response.data.short_tandem_repeat_reads.num_reads)
}

const fetchReads = ({ datasetId, shortTandemRepeatId, filter, limit, offset }: any) => {
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
              age
              pcr_protocol
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
    .then((response) => response.json())
    .then((response) => response.data.short_tandem_repeat_reads.reads)
}

type ShortTandemRepeatReadsProps = {
  datasetId: string
  shortTandemRepeat: ShortTandemRepeatPropType
  filter: {
    population?: string
    sex?: string
    alleles?: {
      repeat_unit?: string
      min_repeats?: number
      max_repeat?: number
    }[]
  }
}

const ShortTandemRepeatReads = ({
  datasetId,
  shortTandemRepeat,
  filter,
}: ShortTandemRepeatReadsProps) => {
  const fetchReadsTimer = useRef(null)
  const fetchNumReadsMemoized = useCallback(() => {
    // @ts-expect-error TS(2769) FIXME: No overload matches this call.
    clearTimeout(fetchReadsTimer.current)
    return new Promise((resolve: any, reject: any) => {
      // @ts-expect-error TS(2322) FIXME: Type 'Timeout' is not assignable to type 'null'.
      fetchReadsTimer.current = setTimeout(() => {
        fetchNumReads({ datasetId, shortTandemRepeatId: shortTandemRepeat.id, filter }).then(
          resolve,
          reject
        )
      }, 300)
    })
  }, [datasetId, shortTandemRepeat, filter])
  const { isLoading, response: numReads, error } = useRequest(fetchNumReadsMemoized)

  const readsStore = useRef(new Map())
  const [readIndex, setReadIndex] = useState(0)

  useEffect(() => {
    readsStore.current.clear()
    setReadIndex(0)
  }, [shortTandemRepeat, filter])

  const fetchRead = useMemo(() => {
    let timer: any = null
    return (readIndexToFetch: any) => {
      const storedRead = readsStore.current.get(readIndexToFetch)
      if (storedRead) {
        return Promise.resolve(storedRead)
      }

      const numReadsToFetch = 50
      return new Promise((resolve: any, reject: any) => {
        clearTimeout(timer)
        timer = setTimeout(() => {
          const readsPromise = fetchReads({
            datasetId,
            shortTandemRepeatId: shortTandemRepeat.id,
            filter,
            limit: numReadsToFetch,
            offset: readIndexToFetch,
          }).then(null, reject)

          Array.from(new Array(numReadsToFetch)).forEach((_: any, i: any) => {
            readsStore.current.set(
              readIndexToFetch + i,
              readsPromise.then((fetchedReads) => {
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

  if (numReads === 0) {
    return <StatusMessage>No matching samples found</StatusMessage>
  }

  return (
    <>
      <ControlSection style={{ marginBottom: '1em' }}>
        <Button
          onClick={() => {
            if (readIndex > 0) {
              setReadIndex((previousReadIndex) => previousReadIndex - 1)
            }
          }}
        >
          Previous sample
        </Button>
        <span>
          Showing sample {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Input
            type="number"
            value={readIndex + 1}
            min={1}
            max={numReads}
            onChange={(e: any) => {
              // @ts-expect-error TS(2531) FIXME: Object is possibly 'null'.
              setReadIndex(Math.max(0, Math.min(numReads - 1, Number(e.target.value) - 1)))
            }}
            style={{ width: '10ch' }}
          />{' '}
          {/* @ts-expect-error TS(2531) FIXME: Object is possibly 'null'. */}
          of {numReads.toLocaleString()}
        </span>

        <Button
          onClick={() => {
            // @ts-expect-error TS(2531) FIXME: Object is possibly 'null'.
            if (readIndex < numReads - 1) {
              setReadIndex((previousReadIndex) => previousReadIndex + 1)
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

type ShortTandemRepeatReadsAllelesFilterControlsProps = {
  shortTandemRepeat: ShortTandemRepeatPropType
  value: {
    repeat_unit?: string
    min_repeats?: number
    max_repeats?: number
  }[]
  onChange: (...args: any[]) => any
}

const ShortTandemRepeatReadsAllelesFilterControls = ({
  shortTandemRepeat,
  value,
  onChange,
}: ShortTandemRepeatReadsAllelesFilterControlsProps) => {
  const maxNumRepeats =
    shortTandemRepeat.allele_size_distribution.distribution[
      shortTandemRepeat.allele_size_distribution.distribution.length - 1
    ][0]

  return (
    <ShortTandemRepeatReadsAllelesFilterControlsWrapper>
      {[0, 1].map((alleleIndex) => (
        <ShortTandemRepeatReadsAllelesFilterControlWrapper key={`${alleleIndex}`}>
          Allele {alleleIndex + 1}: {/* eslint-disable jsx-a11y/label-has-associated-control */}
          <label htmlFor={`short-tandem-repeat-reads-filter-allele-${alleleIndex}-repeat-unit`}>
            Repeat unit {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
            <Select
              id={`short-tandem-repeat-reads-filter-allele-${alleleIndex}-repeat-unit`}
              value={value[alleleIndex].repeat_unit || ''}
              onChange={(e: any) => {
                const newRepeatUnit = e.target.value
                onChange(
                  value.map((v, i) =>
                    i === alleleIndex ? { ...v, repeat_unit: newRepeatUnit } : v
                  )
                )
              }}
            >
              {shortTandemRepeat.allele_size_distribution.repeat_units.length > 1 && (
                <option value="">Any</option>
              )}
              {shortTandemRepeat.allele_size_distribution.repeat_units.map((repeatUnit) => (
                <option key={repeatUnit.repeat_unit} value={repeatUnit.repeat_unit}>
                  {repeatUnit.repeat_unit}
                </option>
              ))}
            </Select>
          </label>{' '}
          <label htmlFor={`short-tandem-repeat-reads-filter-allele-${alleleIndex}-min-repeats`}>
            Min repeats {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
            <Input
              type="number"
              id={`short-tandem-repeat-reads-filter-allele-${alleleIndex}-min-repeats`}
              min={0}
              max={maxNumRepeats}
              value={value[alleleIndex].min_repeats}
              onChange={(e: any) => {
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
            Max repeats {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
            <Input
              type="number"
              id={`short-tandem-repeat-reads-filter-allele-${alleleIndex}-max-repeats`}
              min={0}
              max={maxNumRepeats}
              value={value[alleleIndex].max_repeats}
              onChange={(e: any) => {
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

type ShortTandemRepeatReadsContainerProps = {
  datasetId: string
  shortTandemRepeat: ShortTandemRepeatPropType
  filter: {
    population?: string
    sex?: string
    alleles?: {
      repeat_unit?: string
      min_repeats?: number
      max_repeats?: number
    }[]
  }
}

const ShortTandemRepeatReadsContainer = ({
  datasetId,
  shortTandemRepeat,
  filter: baseFilter,
}: ShortTandemRepeatReadsContainerProps) => {
  const maxNumRepeats =
    shortTandemRepeat.allele_size_distribution.distribution[
      shortTandemRepeat.allele_size_distribution.distribution.length - 1
    ][0]

  const [filter, setFilter] = useState({
    ...baseFilter,
    alleles: [
      {
        repeat_unit:
          shortTandemRepeat.allele_size_distribution.repeat_units.length > 1
            ? null
            : shortTandemRepeat.allele_size_distribution.repeat_units[0].repeat_unit,
        min_repeats: 0,
        max_repeats: maxNumRepeats,
      },
      {
        repeat_unit:
          shortTandemRepeat.allele_size_distribution.repeat_units.length > 1
            ? null
            : shortTandemRepeat.allele_size_distribution.repeat_units[0].repeat_unit,
        min_repeats: 0,
        max_repeats: maxNumRepeats,
      },
    ],
  })

  if (baseFilter.population !== filter.population || baseFilter.sex !== filter.sex) {
    // @ts-expect-error TS(2345) FIXME: Argument of type '{ population?: string | undefine... Remove this comment to see the full error message
    setFilter({
      ...filter,
      ...baseFilter,
    })
  }

  return (
    <>
      <ShortTandemRepeatReadsAllelesFilterControls
        shortTandemRepeat={shortTandemRepeat}
        // @ts-expect-error TS(2322) FIXME: Type '{ repeat_unit: string | null; min_repeats: n... Remove this comment to see the full error message
        value={filter.alleles}
        onChange={(newAllelesFilter) => {
          setFilter((prevFilter) => ({ ...prevFilter, alleles: newAllelesFilter }))
        }}
      />
      <ShortTandemRepeatReads
        datasetId={datasetId}
        shortTandemRepeat={shortTandemRepeat}
        // @ts-expect-error TS(2322) FIXME: Type '{ alleles: { repeat_unit: string | null; min... Remove this comment to see the full error message
        filter={filter}
      />
    </>
  )
}

export default ShortTandemRepeatReadsContainer
