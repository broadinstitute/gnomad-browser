import React from 'react'
import styled from 'styled-components'

import { TooltipAnchor, TooltipHint } from '@gnomad/ui'

const ConstraintHighlight = styled.span`
  display: inline-block;
  padding: 0.25em 0.4em;
  border: 1px solid #000;
  border-radius: 0.3em;
  background: ${(props: any) => props.highlightColor};
  color: #000;
`

export const renderRoundedNumber = (
  num: number | null,
  {
    precision = 1 as number,
    tooltipPrecision = 3,
    highlightColor = null as string | null,
    formatTooltip = ((n) => `${n}`) as (n: number) => string,
  } = {}
) => {
  if (num === null) {
    return '—'
  }

  const roundedNumber = Number(num.toFixed(precision)).toString()
  return (
    // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: any; }' is not... Remove this comment to see the full error message
    <TooltipAnchor tooltip={formatTooltip(num.toFixed(tooltipPrecision))}>
      {highlightColor ? (
        // @ts-expect-error TS(2769) FIXME: No overload matches this call.
        <ConstraintHighlight highlightColor={highlightColor}>{roundedNumber}</ConstraintHighlight>
      ) : (
        // @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
        <TooltipHint>{roundedNumber}</TooltipHint>
      )}
    </TooltipAnchor>
  )
}
