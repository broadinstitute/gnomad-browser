import React, { PropTypes } from 'react'

const Track = ({ width }) => {
  return (
    <div style={{ width: width - 400, border: '1px solid red' }}>
      <p>Test component, width {width}!</p>
    </div>
  )
}
Track.propTypes = {
  width: PropTypes.number.isRequired,
}
export default Track
