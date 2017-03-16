import React, { PropTypes } from 'react'

const Track = ({ width = 10 }) => {
  return (
    <div style={{ width: width - 400, border: '1px solid red' }}>
      <p>Test component, width {width}!</p>
    </div>
  )
}
Track.propTypes = {
  width: PropTypes.number,
}
export default Track
