import React, { PropTypes } from 'react'

const TestComponent = ({ name }) => (
  <div>
    <h3>Hello {name}</h3>
    <p>This is definitely working.</p>
  </div>
)

TestComponent.propTypes = {
  name: PropTypes.string.isRequired,
}

export default TestComponent
