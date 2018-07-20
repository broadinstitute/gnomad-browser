import PropTypes from 'prop-types'
import React from 'react'

import { BaseVariantTrack } from './BaseVariantTrack'
import { VariantAlleleFrequencyPlot } from './VariantAlleleFrequencyPlot'


export const VariantAlleleFrequencyTrack = ({
  leftPanelWidth,
  positionOffset,
  title,
  variants,
  width,
  xScale,
}) => {
  const height = 60

  return (
    <BaseVariantTrack
      leftPanelWidth={leftPanelWidth}
      title={title}
      width={width}
    >
      <VariantAlleleFrequencyPlot
        height={height}
        positionOffset={positionOffset}
        variants={variants}
        width={width}
        xScale={xScale}
      />
    </BaseVariantTrack>
  )
}

VariantAlleleFrequencyTrack.propTypes = {
  leftPanelWidth: PropTypes.number,
  positionOffset: PropTypes.func,
  title: PropTypes.string,
  variants: PropTypes.arrayOf(
    PropTypes.shape({
      allele_freq: PropTypes.number,
      consequence: PropTypes.string,
      pos: PropTypes.number.isRequired,
      variant_id: PropTypes.string.isRequired,
    })
  ).isRequired,
  width: PropTypes.number,
  xScale: PropTypes.func,
}

VariantAlleleFrequencyTrack.defaultProps = {
  title: '',
}
