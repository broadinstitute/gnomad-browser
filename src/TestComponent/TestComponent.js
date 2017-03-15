import React, { PropTypes } from 'react'

const TestComponent = ({ name, geneId }) => (
  <div>
    <h3>Hello {name}</h3>
    <p>The gene is {geneId}</p>
  </div>
)

TestComponent.propTypes = {
  name: PropTypes.string.isRequired,
  geneId: PropTypes.string,
}

export default TestComponent
