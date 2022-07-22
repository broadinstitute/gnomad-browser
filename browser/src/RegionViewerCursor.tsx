import React from 'react'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { Cursor as BaseCursor } from '@gnomad/region-viewer'

const Cursor = (props: any) => (
  <BaseCursor
    {...props}
    renderCursor={(x: any) => <line x1={x} y1={0} x2={x} y2="100%" stroke="#000" strokeWidth={1} />}
  />
)

export default Cursor
