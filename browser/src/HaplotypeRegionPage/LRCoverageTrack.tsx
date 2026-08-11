import React, { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'

import CoverageTrack, { MetricOptions } from '../CoverageTrack'

const LR_COVERAGE_QUERY = `
  query LRCoverage($chrom: String!, $start: Int!, $stop: Int!, $lrCohort: LongReadCohort!) {
    lr_coverage(chrom: $chrom, start: $start, stop: $stop, lr_cohort: $lrCohort) {
      pos
      mean
      median
      over_1
      over_5
      over_10
      over_15
      over_20
      over_25
      over_30
      over_50
      over_100
    }
  }
`

const CoverageSlot = styled.div`
  position: relative;
  min-block-size: 180px;
`

const CoverageStatus = styled.div`
  position: absolute;
  z-index: 1;
  right: 1rem;
  bottom: 0.75rem;
  padding: 0.35rem 0.6rem;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.92);
  color: #555;
  font-size: 0.875rem;
`

const coverageScope = (chrom: string, start: number, stop: number, lrCohort: string) =>
  `${lrCohort}:${chrom}:${start}-${stop}`

type CoverageState = {
  scope: string | null
  data: any[] | null
  error: string | null
}

type LRCoverageTrackProps = {
  chrom: string
  start: number
  stop: number
  lrCohort?: 'hgsvc_hprc' | 'aou'
  viewStart?: number
  viewStop?: number
}

const LRCoverageTrack = ({
  chrom,
  start,
  stop,
  lrCohort = 'hgsvc_hprc',
  viewStart = start,
  viewStop = stop,
}: LRCoverageTrackProps) => {
  const scope = coverageScope(chrom, start, stop, lrCohort)
  const [coverageState, setCoverageState] = useState<CoverageState>({
    scope: null,
    data: null,
    error: null,
  })
  const coverageData = coverageState.scope === scope ? coverageState.data : null
  const error = coverageState.scope === scope ? coverageState.error : null

  useEffect(() => {
    setCoverageState({ scope, data: null, error: null })

    const controller = new AbortController()
    const fetchCoverage = async () => {
      try {
        const response = await fetch('/api/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: LR_COVERAGE_QUERY,
            variables: { chrom, start, stop, lrCohort },
          }),
          signal: controller.signal,
        })
        const result = await response.json()
        if (!controller.signal.aborted && result.data?.lr_coverage) {
          setCoverageState({ scope, data: result.data.lr_coverage, error: null })
        }
      } catch (err: any) {
        if (err.name !== 'AbortError' && !controller.signal.aborted) {
          setCoverageState({ scope, data: null, error: 'Unable to load LR coverage' })
          // eslint-disable-next-line no-console
          console.error('Error fetching LR coverage:', err)
        }
      }
    }
    fetchCoverage()
    return () => controller.abort()
  }, [chrom, start, stop, lrCohort, scope])

  const visibleCoverageData = useMemo(
    () => (coverageData || []).filter(
      (bucket) => bucket.pos >= viewStart && bucket.pos <= viewStop
    ),
    [coverageData, viewStart, viewStop]
  )

  let status = error
  if (!status) {
    if (!coverageData) {
      status = `Updating long-read coverage for ${
        lrCohort === 'aou' ? 'All of Us' : 'HGSVC/HPRC'
      }…`
    } else if (coverageData.length === 0) {
      status = 'No long-read coverage is available for this region.'
    }
  }

  return (
    <CoverageSlot
      data-testid="lr-coverage-slot"
      aria-busy={coverageData === null && error === null ? 'true' : 'false'}
    >
      <CoverageTrack
        key={lrCohort}
        coverageOverThresholds={[1, 5, 10, 15, 20, 25, 30, 50, 100]}
        metric={lrCohort === 'aou' ? MetricOptions.over_5 : MetricOptions.over_20}
        filenameForExport={() =>
          `${chrom}-${start}-${stop}_gnomad_long_read_coverage_${lrCohort}`
        }
        metricControlId="lr-coverage-metric"
        datasets={[
          {
            color: '#9c27b0',
            buckets: visibleCoverageData,
            name: `Long-read coverage — ${lrCohort === 'aou' ? 'All of Us' : 'HGSVC/HPRC'}`,
            opacity: 0.7,
          },
        ]}
        height={100}
        datasetId="gnomad_r4"
      />
      {status && (
        <CoverageStatus role="status" aria-live="polite">
          {status}
        </CoverageStatus>
      )}
    </CoverageSlot>
  )
}

export default LRCoverageTrack
