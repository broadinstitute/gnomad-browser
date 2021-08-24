import React from 'react'

import AttributeList from '../AttributeList'
import Link from '../Link'

import { ShortTandemRepeatVariantPropType } from './ShortTandemRepeatPropTypes'

const ShortTandemRepeatVariantAttributes = ({ shortTandemRepeatVariant }) => {
  return (
    <AttributeList>
      <AttributeList.Item label="Region">
        <Link
          to={`/region/${shortTandemRepeatVariant.region.chrom}-${shortTandemRepeatVariant.region.start}-${shortTandemRepeatVariant.region.stop}`}
        >
          {shortTandemRepeatVariant.region.chrom}-{shortTandemRepeatVariant.region.start}-
          {shortTandemRepeatVariant.region.stop}
        </Link>
      </AttributeList.Item>
      <AttributeList.Item label="Repeat unit">
        {shortTandemRepeatVariant.repeat_unit}
      </AttributeList.Item>
    </AttributeList>
  )
}

ShortTandemRepeatVariantAttributes.propTypes = {
  shortTandemRepeatVariant: ShortTandemRepeatVariantPropType.isRequired,
}

export default ShortTandemRepeatVariantAttributes
