import PropTypes from 'prop-types'

export const trackPropTypes = {
  // used only by navigator
  invertOffset: PropTypes.func,
  leftPanelWidth: PropTypes.number,
  // used only by track-coverage, track-transcript, and track-position-table
  offsetRegions: PropTypes.arrayOf(
    PropTypes.shape({
      color: PropTypes.string.isRequired,
      feature_type: PropTypes.string.isRequired,
      offset: PropTypes.number.isRequired,
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
      strand: PropTypes.oneOf(['+', '-']),
      thickness: PropTypes.string.isRequired,
    })
  ),
  // unused
  padding: PropTypes.number,
  positionOffset: PropTypes.func,
  // unused
  regionAttributes: PropTypes.objectOf(
    PropTypes.shape({
      color: PropTypes.string.isRequired,
      thickness: PropTypes.string.isRequired,
    })
  ),
  rightPanelWidth: PropTypes.number,
  width: PropTypes.number,
  xScale: PropTypes.func,
  // unused
  xScaleBand: PropTypes.func,
}

export const getTrackProps = props => {
  const {
    invertOffset,
    leftPanelWidth,
    offsetRegions,
    padding,
    positionOffset,
    regionAttributes,
    rightPanelWidth,
    width,
    xScale,
    xScaleBand,
    ...rest
  } = props

  return {
    trackProps: {
      invertOffset,
      leftPanelWidth,
      offsetRegions,
      padding,
      positionOffset,
      regionAttributes,
      rightPanelWidth,
      width,
      xScale,
      xScaleBand,
    },
    others: rest,
  }
}
