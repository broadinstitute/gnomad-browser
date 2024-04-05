import React from 'react'
import styled from 'styled-components'

import { TooltipAnchor, TooltipHint } from '@gnomad/ui'

const AttributeList = styled.dl`
  margin: 0;

  dt,
  dd {
    display: inline-block;
    line-height: 1.75;
  }

  dt {
    font-weight: bold;
    vertical-align: top;
  }

  dd {
    margin-left: 0.5ch;
  }

  @media (max-width: 600px) {
    dt,
    dd {
      display: block;
    }

    dd {
      margin-left: 2ch;
    }
  }
`

type AttributeListItemProps = {
  children: React.ReactNode
  label: string | React.ReactNode
  tooltip?: string
}

export const AttributeListItem = ({ children, label, tooltip }: AttributeListItemProps) => (
  <div>
    <dt>
      {tooltip ? (
        // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: any; }' is not... Remove this comment to see the full error message
        <TooltipAnchor tooltip={tooltip}>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <TooltipHint>{label}</TooltipHint>
        </TooltipAnchor>
      ) : (
        label
      )}
    </dt>
    <dd>{children}</dd>
  </div>
)

export default AttributeList
