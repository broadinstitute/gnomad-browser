import React from 'react'

import { TooltipAnchor } from './TooltipAnchor'


export function withTooltip(Component) {
  function WithTooltip(props) {
    return (
      <TooltipAnchor {...props} tooltipComponent={Component} />
    )
  }
  WithTooltip.displayName = `WithTooltip(${Component.displayName || Component.name || 'Component'})`
  return WithTooltip
}
