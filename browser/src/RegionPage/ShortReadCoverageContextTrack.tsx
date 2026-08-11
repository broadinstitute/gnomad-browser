import React from 'react'

import RegionCoverageTrack from './RegionCoverageTrack'

export const SHORT_READ_COVERAGE_CAVEAT =
  'Different samples, assays, and processing pipelines from the selected long-read cohort. Tracks use independent scales; values and apparent troughs are not directly comparable and do not establish callability or relative technology performance.'

type Props = {
  chrom: string
  start: number
  stop: number
  viewStart: number
  viewStop: number
}

const ShortReadCoverageContextTrack = ({ chrom, start, stop, viewStart, viewStop }: Props) => (
  <RegionCoverageTrack
    datasetId="gnomad_r4"
    chrom={chrom}
    start={start}
    stop={stop}
    viewStart={viewStart}
    viewStop={viewStop}
    includeExomeCoverage
    includeGenomeCoverage
    height={100}
    metricControlId="sr-coverage-metric"
    exomeLabel="Short-read exomes (gnomAD v4.0)"
    genomeLabel="Short-read genomes (gnomAD v3.0.1)"
    filenameForExport={`${chrom}-${start}-${stop}_gnomad_short_read_coverage`}
    errorMessage="Unable to load short-read coverage context. Long-read data are unaffected."
    unavailableMessage="Short-read exome and genome coverage are unavailable in this region. Long-read data are unaffected."
  />
)

export default ShortReadCoverageContextTrack
