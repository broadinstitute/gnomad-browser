import React from 'react'
import styled from 'styled-components'

import Link from '../Link'

const TranscriptLink = styled(({ isCanonical, isSelected, ...rest }) => <Link {...rest} />)`
  border-bottom: ${({ isSelected, isCanonical }) => {
    if (isSelected) {
      return '1px solid red'
    }
    if (isCanonical) {
      return '1px solid black'
    }
    return 'none'
  }};
  background-color: ${({ isSelected }) => (isSelected ? 'rgba(10, 121, 191, 0.1)' : 'none')};
`

export default TranscriptLink
