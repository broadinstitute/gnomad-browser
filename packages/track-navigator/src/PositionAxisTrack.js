import React from 'react'

import { Track } from '@broad/region-viewer'

import PositionAxis from './PositionAxis'

export const PositionAxisTrack = () => (
  <Track>
    {({ scalePosition, width }) => <PositionAxis scalePosition={scalePosition} width={width} />}
  </Track>
)
