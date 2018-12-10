import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

const Wrapper = styled.span`
  line-height: 1.5;
  text-align: center;
  white-space: pre-line;
`

export const DefaultTooltip = ({ tooltip }) => <Wrapper>{tooltip}</Wrapper>

DefaultTooltip.propTypes = {
  tooltip: PropTypes.string.isRequired,
}
