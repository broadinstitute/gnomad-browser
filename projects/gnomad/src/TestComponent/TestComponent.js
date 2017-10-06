import React from 'react'
import styled from 'styled-components'
import PropTypes from 'prop-types'

const TestWrapper = styled.div`
  border: 1px solid #000;
`

const TestComponent = ({ name, geneId }) => (
  <TestWrapper>
    <h3>Hello {name}!!</h3>
    <p>The gene is {geneId}</p>
  </TestWrapper>
)

TestComponent.propTypes = {
  name: PropTypes.string.isRequired,
  geneId: PropTypes.string.isRequired,
}

export default TestComponent
