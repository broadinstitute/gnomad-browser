import PropTypes from 'prop-types'
import React from 'react'

import { TooltipAnchor } from '..'

const BasicTooltip = ({ tooltip }) => <span>{tooltip}</span>

BasicTooltip.propTypes = {
  tooltip: PropTypes.string.isRequired,
}

const TooltipExample = () => (
  <TooltipAnchor tooltip="A tooltip" tooltipComponent={BasicTooltip}>
    <span>Hover here</span>
  </TooltipAnchor>
)

export default TooltipExample
