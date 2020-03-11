import { transparentize } from 'polished'
import React, { PureComponent } from 'react'

import BaseVariantTrack from '@gnomad/track-variant'
import { getCategoryFromConsequence } from '@gnomad/utilities'

const consequenceCategoryColors = {
  lof: transparentize(0.3, '#FF583F'),
  missense: transparentize(0.3, '#F0C94D'),
  synonymous: transparentize(0.3, 'green'),
  other: transparentize(0.3, '#757575'),
}

const variantColor = variant => {
  const category = getCategoryFromConsequence(variant.consequence) || 'other'
  return consequenceCategoryColors[category]
}

class VariantTrack extends PureComponent {
  render() {
    return <BaseVariantTrack variantColor={variantColor} {...this.props} />
  }
}

export default VariantTrack
