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

type OwnProps = {
  children?: React.ReactNode
}

// @ts-expect-error TS(2456) FIXME: Type alias 'Props' circularly references itself.
type Props = OwnProps & typeof ControlSection.defaultProps

// @ts-expect-error TS(7022) FIXME: 'ControlSection' implicitly has type 'any' because... Remove this comment to see the full error message
const ControlSection = ({ children, ...otherProps }: Props) => (
  <Wrapper {...otherProps}>
    {React.Children.map(children, (child) => (
      <ControlWrapper>{child}</ControlWrapper>
    ))}
  </Wrapper>
)

ControlSection.defaultProps = {
  children: undefined,
}

export default ControlSection
