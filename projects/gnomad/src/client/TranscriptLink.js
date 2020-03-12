import React from 'react'
import styled from 'styled-components'

import Link from './Link'

const TranscriptLink = styled(({ isSelected, ...rest }) => <Link {...rest} />)`
  text-decoration: ${({ isSelected }) => (isSelected ? 'underline' : 'none')};
`

export default TranscriptLink
