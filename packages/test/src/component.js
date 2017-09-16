import React, { PropTypes } from 'react'
import styled from 'styled-components'

const TestWrapper = styled.div`
  border: 3px solid #000;
`

const TestComponent = ({ message }) => {
  return (
    <TestWrapper>
      {'Hey dude!! Whas cooking???!'}{message}
    </TestWrapper>
  )
}

TestComponent.propTypes = {
  message: PropTypes.string.isRequired,
}

export default TestComponent
