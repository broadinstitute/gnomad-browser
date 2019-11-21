import React from 'react'
import styled from 'styled-components'

import { TooltipAnchor, TooltipHint } from '@broad/ui'

const ConstraintHighlight = styled.span`
  display: inline-block;
  padding: 0.25em 0.4em;
  border: 1px solid #000;
  border-radius: 0.3em;
  background: ${props => props.highlightColor};
  color: #000;
`

export const renderRoundedNumber = (
  num,
  { precision = 1, tooltipPrecision = 3, highlightColor = null, formatTooltip = n => n } = {}
) => {
  if (num === null) {
    return '—'
  }

  const roundedNumber = Number(num.toFixed(precision)).toString()
  return (
    <TooltipAnchor tooltip={formatTooltip(num.toFixed(tooltipPrecision))}>
      {highlightColor ? (
        <ConstraintHighlight highlightColor={highlightColor}>{roundedNumber}</ConstraintHighlight>
      ) : (
        <TooltipHint>{roundedNumber}</TooltipHint>
      )}
    </TooltipAnchor>
  )
}
