import PropTypes from 'prop-types'
import React from 'react'
import { withSize } from 'react-sizeme'
import styled from 'styled-components'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { PositionAxisTrack } from '@gnomad/region-viewer'

import RegionCoverageTrack from '../RegionPage/RegionCoverageTrack'
import RegionViewer from '../RegionViewer/RegionViewer'
import Link from '../Link'
import StatusMessage from '../StatusMessage'

// The 100% width/height container is necessary the component
// to size to fit its container vs staying at its initial size.
const Wrapper = styled.div`
  width: 100%;
`

// @ts-expect-error TS(2339) FIXME: Property 'datasetId' does not exist on type '{}'.
const VariantNotFound = withSize()(({ datasetId, size: { width }, variantId }) => {
  const parts = variantId.split('-')
  const chrom = parts[0]
  const pos = Number(parts[1])

  const redirectRegion = `${chrom}-${pos - 20}-${pos + 20}`

  const regionViewerRegions = [
    {
      start: Math.max(1, pos - 20),
      stop: pos + 20,
    },
  ]

  return (
    <Wrapper>
      <StatusMessage>
        Variant not found
        <br />
        <br />
        <Link to={`/region/${redirectRegion}`}>View surrounding region</Link>
      </StatusMessage>
      <RegionViewer regions={regionViewerRegions} rightPanelWidth={0} width={width}>
        <RegionCoverageTrack
          datasetId={datasetId}
          chrom={chrom}
          start={regionViewerRegions[0].start}
          stop={regionViewerRegions[0].stop}
        />
        <PositionAxisTrack />
      </RegionViewer>
    </Wrapper>
  )
})

VariantNotFound.displayName = 'VariantNotFound'

VariantNotFound.propTypes = {
  // @ts-expect-error TS(2322) FIXME: Type '{ variantId: PropTypes.Validator<string>; }'... Remove this comment to see the full error message
  variantId: PropTypes.string.isRequired,
}

export default VariantNotFound
