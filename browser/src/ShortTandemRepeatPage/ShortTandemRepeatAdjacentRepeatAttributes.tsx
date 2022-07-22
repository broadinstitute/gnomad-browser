import React from 'react'

import AttributeList from '../AttributeList'
import InlineList from '../InlineList'
import Link from '../Link'

import { ShortTandemRepeatAdjacentRepeatPropType } from './ShortTandemRepeatPropTypes'

type Props = {
  adjacentRepeat: ShortTandemRepeatAdjacentRepeatPropType
}

const ShortTandemRepeatAdjacentRepeatAttributes = ({ adjacentRepeat }: Props) => {
  return (
    <AttributeList>
      {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
      <AttributeList.Item label="Reference region">
        <Link
          to={`/region/${adjacentRepeat.reference_region.chrom}-${adjacentRepeat.reference_region.start}-${adjacentRepeat.reference_region.stop}`}
        >
          {adjacentRepeat.reference_region.chrom}-{adjacentRepeat.reference_region.start}-
          {adjacentRepeat.reference_region.stop}
        </Link>
      </AttributeList.Item>
      {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
      <AttributeList.Item label={`Repeat unit${adjacentRepeat.repeat_units.length > 1 ? 's' : ''}`}>
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
      </AttributeList.Item>
    </AttributeList>
  )
}

export default ShortTandemRepeatAdjacentRepeatAttributes
