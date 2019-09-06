import PropTypes from 'prop-types'
import React from 'react'

import { Track } from '@broad/region-viewer'

import { VariantPlot } from './VariantPlot'

export const VariantTrack = ({ title, ...otherProps }) => (
  <Track title={title}>
    {({ scalePosition, width }) => (
      <VariantPlot {...otherProps} scalePosition={scalePosition} width={width} />
    )}
  </Track>
)

VariantTrack.propTypes = {
  title: PropTypes.string,
}

VariantTrack.defaultProps = {
  title: '',
}
