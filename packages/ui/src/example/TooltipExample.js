import React from 'react'

import { withTooltip } from '..'


const WithTooltip = withTooltip(props => <span>{props.tooltip}</span>)


const TextWithTooltip = ({ text }) => (
  <WithTooltip tooltip={text}>
    <span>{text}</span>
  </WithTooltip>
)


export default () => <TextWithTooltip text="Hello world" />
