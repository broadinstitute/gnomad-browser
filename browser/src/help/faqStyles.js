import styled from 'styled-components'

import { withAnchor } from '../AnchorLink'

export const SectionHeading = withAnchor(styled.h2``)

export const Question = withAnchor(
  styled.dt`
    font-weight: bold;
  `
)

export const Answer = styled.dd`
  margin: 0;
`
