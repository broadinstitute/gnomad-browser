import React from 'react'
import PropTypes from 'prop-types'

import AttributeList from '../AttributeList'

const RegionInfo = ({ region }) => {
  const { start, stop } = region
  return (
    <AttributeList labelWidth={120}>
      <AttributeList.Item label="Region size">
        {(stop - start).toLocaleString()} BP
      </AttributeList.Item>
    </AttributeList>
  )
}

RegionInfo.propTypes = {
  region: PropTypes.shape({
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
}

export default RegionInfo
