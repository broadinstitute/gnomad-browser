import React from 'react'
import PropTypes from 'prop-types'
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
  message: PropTypes.number,
}
TestComponent.defaultProps = {
  message: 0,
}
export default TestComponent
