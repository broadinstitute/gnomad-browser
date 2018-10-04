import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import { regionData } from '@broad/region'
import { variantCount } from '@broad/redux-variants'

import {
  GeneAttributes,
  GeneAttributeKeys,
  GeneAttributeKey,
  GeneAttributeValues,
  GeneAttributeValue,
} from '@broad/ui'

const RegionInfo = ({ region, showVariants, variantCount }) => {
  const { start, stop } = region
  return (
    <GeneAttributes>
      <GeneAttributeKeys>
        <GeneAttributeKey>Region size</GeneAttributeKey>
        {showVariants && <GeneAttributeKey>Total variants</GeneAttributeKey>}
      </GeneAttributeKeys>
      <GeneAttributeValues>
        <GeneAttributeValue>{(stop - start).toLocaleString()} BP</GeneAttributeValue>
        {showVariants && <GeneAttributeValue>{variantCount.toLocaleString()}</GeneAttributeValue>}
      </GeneAttributeValues>
    </GeneAttributes>
  )
}

RegionInfo.propTypes = {
  region: PropTypes.shape({
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
  showVariants: PropTypes.bool.isRequired,
  variantCount: PropTypes.number.isRequired,
}

export default connect(state => ({
  region: regionData(state).toJS(),
  variantCount: variantCount(state),
}))(RegionInfo)
