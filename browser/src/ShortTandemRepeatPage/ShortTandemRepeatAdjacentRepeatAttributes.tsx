import React from 'react'

import AttributeList, { AttributeListItem } from '../AttributeList'
import InlineList from '../InlineList'
import Link from '../Link'

import { ShortTandemRepeatAdjacentRepeat } from './ShortTandemRepeatPage'

type Props = {
  adjacentRepeat: ShortTandemRepeatAdjacentRepeat
}

const ShortTandemRepeatAdjacentRepeatAttributes = ({ adjacentRepeat }: Props) => {
  return (
    <AttributeList>
      <AttributeListItem label="Reference region">
        <Link
          to={`/region/${adjacentRepeat.reference_region.chrom}-${adjacentRepeat.reference_region.start}-${adjacentRepeat.reference_region.stop}`}
        >
          {adjacentRepeat.reference_region.chrom}-{adjacentRepeat.reference_region.start}-
          {adjacentRepeat.reference_region.stop}
        </Link>
      </AttributeListItem>
      <AttributeListItem label={`Repeat unit${adjacentRepeat.repeat_units.length > 1 ? 's' : ''}`}>
        <InlineList
          items={adjacentRepeat.repeat_units.map((repeatUnit) => (
            <span>
              {repeatUnit === adjacentRepeat.reference_repeat_unit &&
              adjacentRepeat.repeat_units.length > 1
                ? `${repeatUnit} (reference)`
                : repeatUnit}
            </span>
          ))}
          label={`Repeat unit${adjacentRepeat.repeat_units.length > 1 ? 's' : ''}`}
        />
      </AttributeListItem>
    </AttributeList>
  )
}

export default ShortTandemRepeatAdjacentRepeatAttributes
