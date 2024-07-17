import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'

import { Button, Input, Select } from '@gnomad/ui'

import { GNOMAD_POPULATION_NAMES, PopulationId } from '@gnomad/dataset-metadata/gnomadPopulations'

import AttributeList, { AttributeListItem } from '../AttributeList'
import Delayed from '../Delayed'
import StatusMessage from '../StatusMessage'
import useRequest from '../useRequest'
import ControlSection from '../VariantPage/ControlSection'

import { ShortTandemRepeat } from './ShortTandemRepeatPage'

const ShortTandemRepeatReadImageWrapper = styled.div`
  width: 100%;
`

const ShortTandemRepeatReadImage = styled.img`
  &.zoomedOut {
    display: block;
    max-width: 100%;
    cursor: zoom-in;
  }

  &.zoomedIn {
    position: absolute;
    left: 0;
    display: block;
    cursor: zoom-out;
    padding: 10px;
  }
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
    population: PopulationId
    sex: string
    age?: string
    pcr_protocol: string
    path: string
  }
}

const ShortTandemRepeatRead = ({ read }: ShortTandemRepeatReadProps) => {
  const [readImageZoom, setReadImageZoom] = useState('zoomedOut')

  return (
    <div>
      <AttributeList style={{ marginBottom: '1em' }}>
        <AttributeListItem label="Population">
          {GNOMAD_POPULATION_NAMES[read.population]}
        </AttributeListItem>
        <AttributeListItem label="Sex">{read.sex}</AttributeListItem>
        <AttributeListItem label="Age">
          {read.age || 'Not available for this sample'}
        </AttributeListItem>
        <AttributeListItem label="PCR protocol">
          {read.pcr_protocol.replace('pcr', 'PCR').split('_').join(' ')}
        </AttributeListItem>
        <AttributeListItem label="Allele 1">
          {read.alleles[0].repeat_unit} repeated {read.alleles[0].repeats} times with a{' '}
          {read.alleles[0].repeats_confidence_interval.lower}-
          {read.alleles[0].repeats_confidence_interval.upper} confidence interval
        </AttributeListItem>
        <AttributeListItem label="Allele 2">
          {read.alleles.length > 1 ? (
            <>
              {read.alleles[1].repeat_unit} repeated {read.alleles[1].repeats} times with a{' '}
              {read.alleles[1].repeats_confidence_interval.lower}-
              {read.alleles[1].repeats_confidence_interval.upper} confidence interval
            </>
          ) : (
            'None'
          )}
        </AttributeListItem>
      </AttributeList>
      <ShortTandemRepeatReadImageWrapper>
        <ShortTandemRepeatReadImage
          alt="REViewer read visualization"
          src={read.path}
          className={readImageZoom}
          onClick={() => setReadImageZoom(readImageZoom === 'zoomedOut' ? 'zoomedIn' : 'zoomedOut')}
        />
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

  if (error || !read) {
    return <StatusMessage>Unable to load read</StatusMessage>
  }

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
  shortTandemRepeat: ShortTandemRepeat
  filter: Filters
}

const ShortTandemRepeatReads = ({
  datasetId,
  shortTandemRepeat,
  filter,
}: ShortTandemRepeatReadsProps) => {
  const fetchReadsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchNumReadsMemoized = useCallback(() => {
    if (fetchReadsTimer.current) {
      clearTimeout(fetchReadsTimer.current)
    }
    return new Promise((resolve: any, reject: any) => {
      fetchReadsTimer.current = setTimeout(() => {
        fetchNumReads({ datasetId, shortTandemRepeatId: shortTandemRepeat.id, filter }).then(
          resolve,
          reject
        )
      }, 300)
    })
  }, [datasetId, shortTandemRepeat, filter])
  const { isLoading, response, error } = useRequest(fetchNumReadsMemoized)
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

  const numReads: number = response as unknown as number

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
              setReadIndex(Math.max(0, Math.min(numReads! - 1, Number(e.target.value) - 1)))
            }}
            style={{ width: '10ch' }}
          />{' '}
          of {numReads!.toLocaleString()}
        </span>

        <Button
          onClick={() => {
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
const Label = styled.label`
  padding-right: 1em;
`

type ShortTandemRepeatReadsAllelesFilterControlsProps = {
  shortTandemRepeat: ShortTandemRepeat
  value: {
    repeat_unit: string | null
    min_repeats: number | null
    max_repeats: number | null
  }[]
  maxRepeats: number
  onChange: (...args: any[]) => any
  alleleSizeDistributionRepeatUnits: string[]
}

const ShortTandemRepeatReadsAllelesFilterControls = ({
  value,
  maxRepeats,
  onChange,
  alleleSizeDistributionRepeatUnits,
}: ShortTandemRepeatReadsAllelesFilterControlsProps) => {
  return (
    <ShortTandemRepeatReadsAllelesFilterControlsWrapper>
      {[0, 1].map((alleleIndex) => (
        <ShortTandemRepeatReadsAllelesFilterControlWrapper key={`${alleleIndex}`}>
          Allele {alleleIndex + 1}: &nbsp;{' '}
          {/* eslint-disable jsx-a11y/label-has-associated-control */}
          {alleleSizeDistributionRepeatUnits.length > 1 && (
            <Label htmlFor={`short-tandem-repeat-reads-filter-allele-${alleleIndex}-repeat-unit`}>
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
                {alleleSizeDistributionRepeatUnits.length > 1 && <option value="">Any</option>}
                {alleleSizeDistributionRepeatUnits.map((repeatUnit) => (
                  <option key={repeatUnit} value={repeatUnit}>
                    {repeatUnit}
                  </option>
                ))}
              </Select>
            </Label>
          )}
          <Label htmlFor={`short-tandem-repeat-reads-filter-allele-${alleleIndex}-min-repeats`}>
            Min repeats {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
            <Input
              type="number"
              id={`short-tandem-repeat-reads-filter-allele-${alleleIndex}-min-repeats`}
              min={0}
              max={maxRepeats}
              value={value[alleleIndex].min_repeats}
              onChange={(e: any) => {
                const newMinRepeats = Math.max(Math.min(Number(e.target.value), maxRepeats), 0)
                onChange(
                  value.map((v, i) =>
                    i === alleleIndex ? { ...v, min_repeats: newMinRepeats } : v
                  )
                )
              }}
            />
          </Label>{' '}
          <Label htmlFor={`short-tandem-repeat-reads-filter-allele-${alleleIndex}-max-repeats`}>
            Max repeats {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
            <Input
              type="number"
              id={`short-tandem-repeat-reads-filter-allele-${alleleIndex}-max-repeats`}
              min={0}
              max={maxRepeats}
              value={value[alleleIndex].max_repeats}
              onChange={(e: any) => {
                const newMaxRepeats = Math.max(Math.min(Number(e.target.value), maxRepeats), 0)
                onChange(
                  value.map((v, i) =>
                    i === alleleIndex ? { ...v, max_repeats: newMaxRepeats } : v
                  )
                )
              }}
            />
          </Label>
          {/* eslint-enable jsx-a11y/label-has-associated-control */}
        </ShortTandemRepeatReadsAllelesFilterControlWrapper>
      ))}
    </ShortTandemRepeatReadsAllelesFilterControlsWrapper>
  )
}

type Filters = {
  population: string | null
  sex: string | null
  alleles:
    | {
        repeat_unit: string | null
        min_repeats: number | null
        max_repeats: number | null
      }[]
    | null
}

type ShortTandemRepeatReadsContainerProps = {
  datasetId: string
  shortTandemRepeat: ShortTandemRepeat
  filter: Omit<Filters, 'alleles'>
  maxRepeats: number
  alleleSizeDistributionRepeatUnits: string[]
}

const ShortTandemRepeatReadsContainer = ({
  datasetId,
  shortTandemRepeat,
  maxRepeats,
  alleleSizeDistributionRepeatUnits,
  filter: baseFilter,
}: ShortTandemRepeatReadsContainerProps) => {
  const [filter, setFilter] = useState<Filters>({
    ...baseFilter,
    alleles: [
      {
        repeat_unit:
          alleleSizeDistributionRepeatUnits.length > 1
            ? null
            : alleleSizeDistributionRepeatUnits[0],
        min_repeats: 0,
        max_repeats: maxRepeats,
      },
      {
        repeat_unit:
          alleleSizeDistributionRepeatUnits.length > 1
            ? null
            : alleleSizeDistributionRepeatUnits[0],
        min_repeats: 0,
        max_repeats: maxRepeats,
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
        value={filter.alleles || []}
        onChange={(newAllelesFilter) => {
          setFilter((prevFilter) => ({ ...prevFilter, alleles: newAllelesFilter }))
        }}
        maxRepeats={maxRepeats}
        alleleSizeDistributionRepeatUnits={alleleSizeDistributionRepeatUnits}
      />
      <ShortTandemRepeatReads
        datasetId={datasetId}
        shortTandemRepeat={shortTandemRepeat}
        filter={filter}
      />
    </>
  )
}

export default ShortTandemRepeatReadsContainer
