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
      thickness: PropTypes.string.isRequired,
    })
  ),
  positionOffset: PropTypes.func,
  rightPanelWidth: PropTypes.number,
  width: PropTypes.number,
  xScale: PropTypes.func,
}

export const getTrackProps = props => {
  const {
    invertOffset,
    leftPanelWidth,
    offsetRegions,
    positionOffset,
    rightPanelWidth,
    width,
    xScale,
    ...rest
  } = props

  return {
    trackProps: {
      invertOffset,
      leftPanelWidth,
      offsetRegions,
      positionOffset,
      rightPanelWidth,
      width,
      xScale,
    },
    others: rest,
  }
}
