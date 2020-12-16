import React from 'react'

import { Cursor as BaseCursor } from '@gnomad/region-viewer'

const Cursor = props => (
  <BaseCursor
    {...props}
    renderCursor={x => <line x1={x} y1={0} x2={x} y2="100%" stroke="#000" strokeWidth={1} />}
  />
)

export default Cursor
