import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

/* stylelint-disable block-no-empty */
const ControlWrapper = styled.span``
/* stylelint-enable block-no-empty */

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: center;

    ${ControlWrapper} {
      margin-bottom: 1em;
    }
  }
`

const ControlSection = ({ children }) => (
  <Wrapper>
    {React.Children.map(children, child => (
      <ControlWrapper>{child}</ControlWrapper>
    ))}
  </Wrapper>
)

ControlSection.propTypes = {
  children: PropTypes.node,
}

ControlSection.defaultProps = {
  children: undefined,
}

export default ControlSection
