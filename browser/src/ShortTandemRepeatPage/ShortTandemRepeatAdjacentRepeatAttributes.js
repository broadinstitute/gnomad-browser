import React from 'react'

import AttributeList from '../AttributeList'
import InlineList from '../InlineList'
import Link from '../Link'

import { ShortTandemRepeatAdjacentRepeatPropType } from './ShortTandemRepeatPropTypes'

const ShortTandemRepeatAdjacentRepeatAttributes = ({ adjacentRepeat }) => {
  return (
    <AttributeList>
      <AttributeList.Item label="Reference region">
        <Link
          to={`/region/${adjacentRepeat.reference_region.chrom}-${adjacentRepeat.reference_region.start}-${adjacentRepeat.reference_region.stop}`}
        >
          {adjacentRepeat.reference_region.chrom}-{adjacentRepeat.reference_region.start}-
          {adjacentRepeat.reference_region.stop}
        </Link>
      </AttributeList.Item>
      <AttributeList.Item label={`Repeat unit${adjacentRepeat.repeat_units.length > 1 ? 's' : ''}`}>
        <InlineList
          items={adjacentRepeat.repeat_units.map(repeatUnit => (
            <span>
              {repeatUnit === adjacentRepeat.reference_repeat_unit &&
              adjacentRepeat.repeat_units.length > 1
                ? `${repeatUnit} (reference)`
                : repeatUnit}
            </span>
          ))}
          label={`Repeat unit${adjacentRepeat.repeat_units.length > 1 ? 's' : ''}`}
        />
      </AttributeList.Item>
    </AttributeList>
  )
}

ShortTandemRepeatAdjacentRepeatAttributes.propTypes = {
  adjacentRepeat: ShortTandemRepeatAdjacentRepeatPropType.isRequired,
}

export default ShortTandemRepeatAdjacentRepeatAttributes
