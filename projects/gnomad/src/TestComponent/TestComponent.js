import React from 'react'
// import styled from ''
import PropTypes from 'prop-types'

const TestComponent = ({ name, geneId }) => (
  <div>
    <h3>Hello {name}!!</h3>
    <p>The gene is {geneId}</p>
  </div>
)

TestComponent.propTypes = {
  name: PropTypes.string.isRequired,
  geneId: PropTypes.string.isRequired,
}

export default TestComponent
