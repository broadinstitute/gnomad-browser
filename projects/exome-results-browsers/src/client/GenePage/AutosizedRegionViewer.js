import React from 'react'
import { SizeMe } from 'react-sizeme'
import styled from 'styled-components'

import { RegionViewer } from '@broad/region-viewer'

const Wrapper = styled.div`
  width: 100%;
`

const AutosizedRegionViewer = props => (
  <SizeMe>
    {({ size }) => (
      <Wrapper>
        {size.width && (
          <RegionViewer
            {...props}
            leftPanelWidth={100}
            rightPanelWidth={size.width < 900 ? 0 : 100}
            width={size.width}
          />
        )}
      </Wrapper>
    )}
  </SizeMe>
)

export default AutosizedRegionViewer
