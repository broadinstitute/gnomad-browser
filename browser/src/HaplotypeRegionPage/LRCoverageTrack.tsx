import React, { useEffect, useMemo, useState } from 'react'

import CoverageTrack from '../CoverageTrack'

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
  const [coverageData, setCoverageData] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setCoverageData(null)
    setError(null)
    if (lrCohort === 'aou') return undefined

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
          setCoverageData(result.data.lr_coverage)
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError('Unable to load LR coverage')
          console.error('Error fetching LR coverage:', err)
        }
      }
    }
    fetchCoverage()
    return () => controller.abort()
  }, [chrom, start, stop, lrCohort])

  const visibleCoverageData = useMemo(
    () => (coverageData || []).filter(
      (bucket) => bucket.pos >= viewStart && bucket.pos <= viewStop
    ),
    [coverageData, viewStart, viewStop]
  )

  if (lrCohort === 'aou' || error) {
    return null
  }

  if (!coverageData) {
    return null
  }

  if (coverageData.length === 0) {
    return null
  }

  return (
    <CoverageTrack
      coverageOverThresholds={[1, 5, 10, 15, 20, 25, 30, 50, 100]}
      filenameForExport={() => `${chrom}-${start}-${stop}_gnomad_long_read_coverage`}
      metricControlId="lr-coverage-metric"
      datasets={[
        {
          color: '#9c27b0',
          buckets: visibleCoverageData,
          name: 'Long-read coverage — HGSVC/HPRC',
          opacity: 0.7,
        },
      ]}
      height={100}
      datasetId="gnomad_r4"
    />
  )
}

export default LRCoverageTrack
