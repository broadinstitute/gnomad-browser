import React from 'react'

import { RegionViewer } from '@broad/region-viewer'

import exampleData from '@resources/region-viewer-full-PCSK9-v1.json'

import { CoverageTrack } from '../CoverageTrack'

const {
  exacv1_coverage: exacCoverage,
  exome_coverage: exomeCoverage,
  genome_coverage: genomeCoverage,
  transcript: { exons },
} = exampleData.gene

const coverageDatasets = [
  {
    name: 'exacv1',
    buckets: exacCoverage,
    color: 'rgba(255, 0, 0, 0.5)',
  },
  {
    name: 'exome',
    buckets: exomeCoverage,
    color: 'rgba(70, 130, 180, 0.5)',
  },
  {
    name: 'genome',
    buckets: genomeCoverage,
    color: 'rgba(115, 171, 61, 0.5)',
  },
]

const CoverageTrackExample = () => (
  <RegionViewer padding={75} regions={exons} width={1000}>
    <CoverageTrack datasets={coverageDatasets} height={200} />
  </RegionViewer>
)

export default CoverageTrackExample
