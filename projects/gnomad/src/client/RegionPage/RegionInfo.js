import React from 'react'
import PropTypes from 'prop-types'

import {
  GeneAttributes,
  GeneAttributeKeys,
  GeneAttributeKey,
  GeneAttributeValues,
  GeneAttributeValue,
} from '@broad/ui'

const RegionInfo = ({ region }) => {
  const { start, stop } = region
  return (
    <GeneAttributes>
      <GeneAttributeKeys>
        <GeneAttributeKey>Region size</GeneAttributeKey>
      </GeneAttributeKeys>
      <GeneAttributeValues>
        <GeneAttributeValue>{(stop - start).toLocaleString()} BP</GeneAttributeValue>
      </GeneAttributeValues>
    </GeneAttributes>
  )
}

RegionInfo.propTypes = {
  region: PropTypes.shape({
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
}

export default RegionInfo
