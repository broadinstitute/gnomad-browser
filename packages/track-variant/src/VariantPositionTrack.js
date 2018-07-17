import PropTypes from 'prop-types'
import React from 'react'

import { BaseVariantTrack } from './BaseVariantTrack'
import { VariantPositionPlot } from './VariantPositionPlot'


export const VariantPositionTrack = ({
  leftPanelWidth,
  positionOffset,
  title,
  variantColor,
  variants,
  width,
  xScale,
}) => {
  const height = 10

  return (
    <BaseVariantTrack
      leftPanelWidth={leftPanelWidth}
      title={title}
      width={width}
    >
      <VariantPositionPlot
        height={height}
        positionOffset={positionOffset}
        variantColor={variantColor}
        variants={variants}
        width={width}
        xScale={xScale}
      />
    </BaseVariantTrack>
  )
}

VariantPositionTrack.propTypes = {
  leftPanelWidth: PropTypes.number,
  positionOffset: PropTypes.func,
  title: PropTypes.string,
  variantColor: PropTypes.string,
  variants: PropTypes.arrayOf(
    PropTypes.shape({
      pos: PropTypes.number.isRequired,
      variant_id: PropTypes.string.isRequired,
    })
  ).isRequired,
  width: PropTypes.number,
  xScale: PropTypes.func,
}

VariantPositionTrack.defaultProps = {
  variantColor: '#757575',
  title: '',
}
