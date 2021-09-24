import React from 'react'

import AttributeList from '../AttributeList'
import InlineList from '../InlineList'
import Link from '../Link'

import { ShortTandemRepeatAdjacentRepeatPropType } from './ShortTandemRepeatPropTypes'

const ShortTandemRepeatAdjacentRepeatAttributes = ({ adjacentRepeat }) => {
  return (
    <AttributeList>
      <AttributeList.Item label="Reference repeat unit">
        {adjacentRepeat.reference_repeat_unit}
      </AttributeList.Item>
      <AttributeList.Item label="Reference region">
        <Link
          to={`/region/${adjacentRepeat.reference_region.chrom}-${adjacentRepeat.reference_region.start}-${adjacentRepeat.reference_region.stop}`}
        >
          {adjacentRepeat.reference_region.chrom}-{adjacentRepeat.reference_region.start}-
          {adjacentRepeat.reference_region.stop}
        </Link>
      </AttributeList.Item>
      <AttributeList.Item label="Repeat units">
        <InlineList
          items={adjacentRepeat.repeat_units.map(repeatUnit => (
            <span>{repeatUnit}</span>
          ))}
          label="Repeat units"
        />
      </AttributeList.Item>
    </AttributeList>
  )
}

ShortTandemRepeatAdjacentRepeatAttributes.propTypes = {
  adjacentRepeat: ShortTandemRepeatAdjacentRepeatPropType.isRequired,
}

export default ShortTandemRepeatAdjacentRepeatAttributes
