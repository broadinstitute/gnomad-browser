import React from 'react'
import styled from 'styled-components'

import { RegionViewer } from '@broad/region-viewer'

import regionData from '@resources/2-175000717-180995530.json'

import { GenesTrack } from '..'


const Wrapper = styled.div`
  padding-left: 50px;
  padding-top: 50px;
  border: 1px solid #000;
`

const regions = [{
  chrom: regionData.chrom,
  start: regionData.start,
  stop: regionData.stop,
  feature_type: 'default',
  strand: '+',
}]

const featuresToDisplay = ['default']

const { genes } = regionData
console.log(genes)


const GenesTrackExample = () => {
  return (
    <Wrapper>
      <RegionViewer
        width={1000}
        padding={0}
        regions={regions}
        featuresToDisplay={featuresToDisplay}
      >
        <GenesTrack
          genes={genes}
          onGeneClick={console.log}
        />
      </RegionViewer>
    </Wrapper>
  )
}

export default GenesTrackExample
