import React from 'react'

import { Track } from '@gnomad/region-viewer'

import { PositionAxis } from './PositionAxis'

export const PositionAxisTrack = () => (
  <Track>
    {({ scalePosition, width }) => <PositionAxis scalePosition={scalePosition} width={width} />}
  </Track>
)
