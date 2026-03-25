import React, { useEffect, useState } from 'react'

import CoverageTrack from '../CoverageTrack'

const LR_COVERAGE_QUERY = `
  query LRCoverage($chrom: String!, $start: Int!, $stop: Int!) {
    lr_coverage(chrom: $chrom, start: $start, stop: $stop) {
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
}

const LRCoverageTrack = ({ chrom, start, stop }: LRCoverageTrackProps) => {
  const [coverageData, setCoverageData] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCoverage = async () => {
      try {
        const response = await fetch('/api/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: LR_COVERAGE_QUERY,
            variables: { chrom, start, stop },
          }),
        })
        const result = await response.json()
        if (result.data?.lr_coverage) {
          setCoverageData(result.data.lr_coverage)
        }
      } catch (err) {
        setError('Unable to load LR coverage')
        console.error('Error fetching LR coverage:', err)
      }
    }
    fetchCoverage()
  }, [chrom, start, stop])

  if (error) {
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
      filenameForExport={() => `${chrom}-${start}-${stop}_lr_coverage`}
      datasets={[
        {
          color: '#73ab3d',
          buckets: coverageData,
          name: 'Long Read',
          opacity: 0.7,
        },
      ]}
      height={200}
      datasetId="gnomad_r4"
    />
  )
}

export default LRCoverageTrack
