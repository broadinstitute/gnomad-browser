import PropTypes from 'prop-types'
import React from 'react'
import { withSize } from 'react-sizeme'
import styled from 'styled-components'

import { RegionViewer, PositionAxisTrack } from '@broad/region-viewer'

import RegionCoverageTrack from '../RegionPage/RegionCoverageTrack'
import Link from '../Link'
import StatusMessage from '../StatusMessage'

// The 100% width/height container is necessary the component
// to size to fit its container vs staying at its initial size.
const Wrapper = styled.div`
  width: 100%;
`

const VariantNotFound = withSize()(({ datasetId, size: { width }, variantId }) => {
  const parts = variantId.split('-')
  const chrom = parts[0]
  const pos = Number(parts[1])

  const redirectRegion = `${chrom}-${pos - 20}-${pos + 20}`

  const regionViewerRegions = [
    {
      feature_type: 'region',
      chrom,
      start: pos - 20,
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
      <RegionViewer padding={0} regions={regionViewerRegions} rightPanelWidth={0} width={width}>
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
  variantId: PropTypes.string.isRequired,
}

export default VariantNotFound
