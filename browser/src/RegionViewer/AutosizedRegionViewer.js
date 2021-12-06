import React from 'react'
import { SizeMe } from 'react-sizeme'
import styled from 'styled-components'

import { RegionViewer } from '@gnomad/region-viewer'

const Wrapper = styled.div`
  width: 100%;
`

const AutosizedRegionViewer = props => (
  <SizeMe>
    {({ size }) => (
      <Wrapper>{size.width && <RegionViewer {...props} width={size.width} />}</Wrapper>
    )}
  </SizeMe>
)

export default AutosizedRegionViewer
