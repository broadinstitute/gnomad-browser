import React from 'react'
import styled from 'styled-components'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { RegionViewer } from '@gnomad/region-viewer'

const RegionViewerWrapper = styled.div`
  font-size: 12px;
`

const GnomadRegionViewer = (props: any) => {
  return (
    <RegionViewerWrapper>
      <RegionViewer {...props} />
    </RegionViewerWrapper>
  )
}

export default GnomadRegionViewer
