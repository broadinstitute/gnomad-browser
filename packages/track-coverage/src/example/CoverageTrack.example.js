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
    color: 'rgb(255, 0, 0)',
    opacity: 0.5,
  },
  {
    name: 'exome',
    buckets: exomeCoverage,
    color: 'rgb(70, 130, 180)',
    opacity: 0.5,
  },
  {
    name: 'genome',
    buckets: genomeCoverage,
    color: 'rgb(115, 171, 61)',
    opacity: 0.5,
  },
]

const CoverageTrackExample = () => (
  <RegionViewer
    padding={75}
    regions={exons.filter(exon => exon.feature_type === 'CDS')}
    width={1000}
  >
    <CoverageTrack datasets={coverageDatasets} height={200} />
  </RegionViewer>
)

export default CoverageTrackExample
