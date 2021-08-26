import React from 'react'

import AttributeList from '../AttributeList'
import Link from '../Link'

import { ShortTandemRepeatAdjacentRepeatPropType } from './ShortTandemRepeatPropTypes'

const ShortTandemRepeatAdjacentRepeatAttributes = ({ adjacentRepeat }) => {
  return (
    <AttributeList>
      <AttributeList.Item label="Repeat unit">{adjacentRepeat.repeat_unit}</AttributeList.Item>
      <AttributeList.Item label="Reference region">
        <Link
          to={`/region/${adjacentRepeat.reference_region.chrom}-${adjacentRepeat.reference_region.start}-${adjacentRepeat.reference_region.stop}`}
        >
          {adjacentRepeat.reference_region.chrom}-{adjacentRepeat.reference_region.start}-
          {adjacentRepeat.reference_region.stop}
        </Link>
      </AttributeList.Item>
    </AttributeList>
  )
}

ShortTandemRepeatAdjacentRepeatAttributes.propTypes = {
  adjacentRepeat: ShortTandemRepeatAdjacentRepeatPropType.isRequired,
}

export default ShortTandemRepeatAdjacentRepeatAttributes
