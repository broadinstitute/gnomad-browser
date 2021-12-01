import React from 'react'
import styled from 'styled-components'

import { RegionViewer } from '@gnomad/region-viewer'

const RegionViewerWrapper = styled.div`
  font-size: 12px;
`

const GnomadRegionViewer = props => {
  return (
    <RegionViewerWrapper>
      <RegionViewer {...props} />
    </RegionViewerWrapper>
  )
}

export default GnomadRegionViewer
