import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { TooltipAnchor } from './tooltip/TooltipAnchor'

const TextTooltipWrapper = styled.span`
  line-height: 1.5;
  text-align: center;
  white-space: pre-line;
`

const TextTooltip = ({ text }) => <TextTooltipWrapper>{text}</TextTooltipWrapper>

TextTooltip.propTypes = {
  text: PropTypes.string.isRequired,
}

const BADGE_COLOR = {
  error: '#DD2C00',
  info: '#424242',
  success: '#2E7D32',
  warning: 'orange',
}

const BadgeWrapper = styled.span`
  display: inline-block;
  padding: 0.25em 0.4em;
  border: 1px solid #000;
  border-radius: 0.3em;
  background: ${props => BADGE_COLOR[props.level]};
  color: ${props => (props.level === 'warning' ? '#000' : '#fff')};
  font-size: 0.75em;
  font-weight: bold;
`

export const Badge = ({ children, level, tooltip }) =>
  tooltip ? (
    <TooltipAnchor text={tooltip} tooltipComponent={TextTooltip}>
      <BadgeWrapper level={level}>{children}</BadgeWrapper>
    </TooltipAnchor>
  ) : (
    <BadgeWrapper level={level}>{children}</BadgeWrapper>
  )

Badge.propTypes = {
  children: PropTypes.string.isRequired,
  level: PropTypes.oneOf(['error', 'info', 'success', 'warning']),
  tooltip: PropTypes.string,
}

Badge.defaultProps = {
  level: 'info',
  tooltip: undefined,
}
