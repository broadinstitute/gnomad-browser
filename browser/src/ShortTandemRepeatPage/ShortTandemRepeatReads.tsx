import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Dispatch,
  SetStateAction,
} from 'react'
import styled from 'styled-components'

import { Button, Input, Select } from '@gnomad/ui'

import { GNOMAD_POPULATION_NAMES, PopulationId } from '@gnomad/dataset-metadata/gnomadPopulations'

import Delayed from '../Delayed'
import StatusMessage from '../StatusMessage'
import useRequest from '../useRequest'
import ControlSection from '../VariantPage/ControlSection'
import { ShortTandemRepeat, Sex } from './ShortTandemRepeatPage'
import {
  GenotypeQuality,
  qualityDescriptionLabels,
  genotypeQualityKeys,
} from './qualityDescription'
import { qScoreKeys, QScoreBin, qScoreLabels } from './qScore'
import InfoButton from '../help/InfoButton'
import ShortTandemRepeatPopulationOptions from './ShortTandemRepeatPopulationOptions'

const ShortTandemRepeatReadImageWrapper = styled.div`
  width: 100%;
`

const KeyValueList = styled.dl`
  margin: 0;

  dt,
  dd {
    display: inline-block;
    line-height: 1.75;
  }

  dt {
    font-weight: bold;
    vertical-align: top;
  }

  dd {
    margin-left: 0.5ch;
  }

  @media (max-width: 600px) {
    dt,
    dd {
      display: block;
    }

    dd {
      margin-left: 2ch;
    }
  }
`
const InlineKeyValue = styled.div`
  display: inline-block;
  padding-right: 10em;
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

export type AlleleFilter = {
  repeat_unit: string | null
  min_repeats: number | null
  max_repeats: number | null
}

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
    quality_description: GenotypeQuality
    q_score: number
  }
}

const ShortTandemRepeatRead = ({ read }: ShortTandemRepeatReadProps) => {
  const [readImageZoom, setReadImageZoom] = useState('zoomedOut')

  return (
    <div>
      <KeyValueList style={{ marginBottom: '1em' }}>
        <InlineKeyValue>
          <dt>Genetic ancestry group</dt>
          <dd>{GNOMAD_POPULATION_NAMES[read.population]}</dd>
        </InlineKeyValue>
        <InlineKeyValue>
          <dt>Sex</dt>
          <dd>{read.sex}</dd>
        </InlineKeyValue>
        <InlineKeyValue>
          <dt>Age</dt>
          <dd>{read.age || 'Not available for this sample'}</dd>
        </InlineKeyValue>

        <div>
          <dt>Allele 1</dt>
          <dd>
            {read.alleles[0].repeat_unit} repeated {read.alleles[0].repeats} times with a{' '}
            {read.alleles[0].repeats_confidence_interval.lower}-
            {read.alleles[0].repeats_confidence_interval.upper} confidence interval
          </dd>
        </div>
        <div>
          <dt>Allele 2</dt>
          <dd>
            {read.alleles.length > 1 ? (
              <>
                {read.alleles[1].repeat_unit} repeated {read.alleles[1].repeats} times with a{' '}
                {read.alleles[1].repeats_confidence_interval.lower}-
                {read.alleles[1].repeats_confidence_interval.upper} confidence interval
              </>
            ) : (
              'None'
            )}
          </dd>
        </div>

        <InlineKeyValue style={{ paddingRight: '2em' }}>
          <dt>
            Manual review <InfoButton topic="str-genotype-quality-manual-review" />
          </dt>
          <dd>{qualityDescriptionLabels[read.quality_description]}</dd>
        </InlineKeyValue>
        <InlineKeyValue>
          <dt>
            Q score <InfoButton topic="str-genotype-quality-q-score" />
          </dt>
          <dd>{read.q_score.toFixed(3)}</dd>
        </InlineKeyValue>
      </KeyValueList>
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
	      quality_description
	      q_score
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

const ShortTandemRepeatReadsFilterControlsWrapper = styled.div`
  margin-bottom: 1em;
`

const ShortTandemRepeatReadsFilterControlWrapper = styled.div`
  display: inline-block;
  margin-bottom: 0.5em;

  input {
    display: inline-block;
    width: 12ch;
  }
`
const Label = styled.label`
  padding-right: 1em;
`

export type Filters = {
  population: PopulationId | null
  sex: Sex | null
  alleles:
    | {
        repeat_unit: string | null
        min_repeats: number | null
        max_repeats: number | null
      }[]
    | null
  q_score: QScoreBin | null
  quality_description: GenotypeQuality | null
}

type ShortTandemRepeatReadsAllelesFilterControlsProps = {
  shortTandemRepeat: ShortTandemRepeat
  value: AlleleFilter[]
  maxRepeats: number
  onChangeCallback: (...args: any[]) => any
  alleleSizeDistributionRepeatUnits: string[]
}

const ShortTandemRepeatReadsAllelesFilterControls = ({
  value,
  maxRepeats,
  onChangeCallback,
  alleleSizeDistributionRepeatUnits,
}: ShortTandemRepeatReadsAllelesFilterControlsProps) => {
  return (
    <ShortTandemRepeatReadsFilterControlsWrapper>
      {[0, 1].map((alleleIndex) => (
        <div>
          <ShortTandemRepeatReadsFilterControlWrapper key={`${alleleIndex}`}>
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
                    onChangeCallback(
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
                  onChangeCallback(
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
                  onChangeCallback(
                    value.map((v, i) =>
                      i === alleleIndex ? { ...v, max_repeats: newMaxRepeats } : v
                    )
                  )
                }}
              />
            </Label>
            {/* eslint-enable jsx-a11y/label-has-associated-control */}
          </ShortTandemRepeatReadsFilterControlWrapper>
          {alleleIndex === 0 && <br />}
        </div>
      ))}
    </ShortTandemRepeatReadsFilterControlsWrapper>
  )
}

type ShortTandemRepeatReadsQualityFilterControlsProps = {
  shortTandemRepeat: ShortTandemRepeat
  selectedQualityDescription: GenotypeQuality | null
  setSelectedQualityDescription: Dispatch<SetStateAction<GenotypeQuality | null>>
  selectedQScoreBin: QScoreBin | null
  setSelectedQScoreBin: Dispatch<SetStateAction<QScoreBin | null>>
}

const ShortTandemRepeatReadsQualityFilterControls = ({
  selectedQualityDescription,
  setSelectedQualityDescription,
  selectedQScoreBin,
  setSelectedQScoreBin,
}: ShortTandemRepeatReadsQualityFilterControlsProps) => {
  return (
    <ShortTandemRepeatReadsFilterControlsWrapper>
      <ShortTandemRepeatReadsFilterControlWrapper key="manual-review">
        <Label htmlFor="short-tandem-repeat-reads-manual-review-filter">
          Manual review: &nbsp;
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Select
            id="short-tandem-repeat-reads-manual-review-filter"
            value={selectedQualityDescription || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const newValue =
                e.currentTarget.value === '' ? null : (e.currentTarget.value as GenotypeQuality)
              setSelectedQualityDescription(newValue)
            }}
          >
            <option key="any" value="">
              Any
            </option>
            {genotypeQualityKeys.map((genotypeQualityKey) => (
              <option key={genotypeQualityKey} value={genotypeQualityKey}>
                {qualityDescriptionLabels[genotypeQualityKey]}
              </option>
            ))}
          </Select>
        </Label>{' '}
      </ShortTandemRepeatReadsFilterControlWrapper>
      <ShortTandemRepeatReadsFilterControlWrapper key="q-score">
        <Label htmlFor="short-tandem-repeat-reads-q-score-filter">
          Q score: &nbsp;
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Select
            id="short-tandem-repeat-reads-q-score-filter"
            value={selectedQScoreBin || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const newValue =
                e.currentTarget.value === '' ? null : (e.currentTarget.value as QScoreBin)
              setSelectedQScoreBin(newValue)
            }}
          >
            <option key="any" value="">
              Any
            </option>
            {qScoreKeys.map((qScoreKey) => (
              <option key={qScoreKey} value={qScoreKey}>
                {qScoreLabels[qScoreKey]}
              </option>
            ))}
          </Select>
        </Label>
      </ShortTandemRepeatReadsFilterControlWrapper>
    </ShortTandemRepeatReadsFilterControlsWrapper>
  )
}

type ShortTandemRepeatReadsContainerProps = {
  datasetId: string
  shortTandemRepeat: ShortTandemRepeat
  selectedPopulation: PopulationId | null
  setSelectedPopulation: Dispatch<SetStateAction<PopulationId | null>>
  selectedSex: Sex | null
  setSelectedSex: Dispatch<SetStateAction<Sex | null>>
  maxRepeats: number
  alleleSizeDistributionRepeatUnits: string[]
  populations: PopulationId[]
}

const ShortTandemRepeatReadsContainer = ({
  datasetId,
  shortTandemRepeat,
  maxRepeats,
  alleleSizeDistributionRepeatUnits,
  selectedPopulation,
  setSelectedPopulation,
  selectedSex,
  setSelectedSex,
  populations,
}: ShortTandemRepeatReadsContainerProps) => {
  const defaultAlleleFilter: AlleleFilter[] = [
    {
      repeat_unit:
        alleleSizeDistributionRepeatUnits.length > 1 ? null : alleleSizeDistributionRepeatUnits[0],
      min_repeats: 0,
      max_repeats: maxRepeats,
    },
    {
      repeat_unit:
        alleleSizeDistributionRepeatUnits.length > 1 ? null : alleleSizeDistributionRepeatUnits[0],
      min_repeats: 0,
      max_repeats: maxRepeats,
    },
  ]

  const [selectedQScoreBin, setSelectedQScoreBin] = useState<QScoreBin | null>(null)
  const [selectedQualityDescription, setSelectedQualityDescription] =
    useState<GenotypeQuality | null>(null)
  const [selectedAlleles, setSelectedAlleles] = useState<AlleleFilter[]>(defaultAlleleFilter)

  const filter: Filters = {
    population: selectedPopulation,
    sex: selectedSex,
    alleles: selectedAlleles,
    q_score: selectedQScoreBin,
    quality_description: selectedQualityDescription,
  }

  return (
    <>
      <ControlSection style={{ marginBottom: '1em' }}>
        <ShortTandemRepeatPopulationOptions
          id={`${shortTandemRepeat.id}-genotype-distribution`}
          populations={populations}
          selectedPopulation={selectedPopulation}
          selectedSex={selectedSex}
          setSelectedPopulation={setSelectedPopulation}
          setSelectedSex={setSelectedSex}
        />
      </ControlSection>
      <ShortTandemRepeatReadsAllelesFilterControls
        shortTandemRepeat={shortTandemRepeat}
        value={selectedAlleles || []}
        onChangeCallback={(newAllelesFilter) => {
          setSelectedAlleles(newAllelesFilter)
        }}
        maxRepeats={maxRepeats}
        alleleSizeDistributionRepeatUnits={alleleSizeDistributionRepeatUnits}
      />
      <ShortTandemRepeatReadsQualityFilterControls
        shortTandemRepeat={shortTandemRepeat}
        selectedQualityDescription={selectedQualityDescription}
        setSelectedQualityDescription={setSelectedQualityDescription}
        selectedQScoreBin={selectedQScoreBin}
        setSelectedQScoreBin={setSelectedQScoreBin}
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
