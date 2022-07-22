import React from 'react'
import { SizeMe } from 'react-sizeme'
import styled from 'styled-components'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { RegionViewer } from '@gnomad/region-viewer'

const Wrapper = styled.div`
  width: 100%;
`

const AutosizedRegionViewer = (props: any) => (
  <SizeMe>
    {({ size }) => (
      <Wrapper>{size.width && <RegionViewer {...props} width={size.width} />}</Wrapper>
    )}
  </SizeMe>
)

export default AutosizedRegionViewer
