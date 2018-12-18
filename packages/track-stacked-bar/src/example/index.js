import React from 'react'
import styled from 'styled-components'
import { RegionViewer } from '@broad/region-viewer'

import TrackStackedBar from '../index'

import regionData from '@resources/2-179390717-179695530.json'  // eslint-disable-line

const Wrapper = styled.div`
  padding-left: 50px;
  padding-top: 50px;
  border: 1px solid #000;
`

const regions = [{
  chrom: 2,
  start: 179390717,
  stop: 179695530,
  feature_type: 'default',
  strand: '+',
}]

const featuresToDisplay = ['default']

const TrackStackedBarExample = () => {
  const { total_consequence_counts, gnomad_consequence_buckets: { buckets } } = regionData
  return (
    <Wrapper>
      <RegionViewer
        width={1000}
        padding={0}
        regions={regions}
        featuresToDisplay={featuresToDisplay}
      >
        <TrackStackedBar height={300} data={buckets} />
      </RegionViewer>
    </Wrapper>
  )
}

export default TrackStackedBarExample

