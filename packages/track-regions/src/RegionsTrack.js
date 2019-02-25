import PropTypes from 'prop-types'
import React from 'react'

import { Track } from '@broad/region-viewer'

import { RegionsPlot } from './RegionsPlot'

export const RegionsTrack = ({
  renderLeftPanel,
  renderRightPanel,
  renderTopPanel,
  title,
  ...rest
}) => (
  <Track
    renderLeftPanel={renderLeftPanel}
    renderRightPanel={renderRightPanel}
    renderTopPanel={renderTopPanel}
  >
    {({ scalePosition, width }) => (
      <RegionsPlot {...rest} scalePosition={scalePosition} width={width} />
    )}
  </Track>
)

RegionsTrack.propTypes = {
  title: PropTypes.string,
}

RegionsTrack.defaultProps = {
  title: '',
}
