import styled from 'styled-components'

import { Page } from '@gnomad/ui'

export default styled(Page)<{ $withSectionLinks?: boolean }>`
  ${(props) => props.$withSectionLinks && 'padding-left: 44px;'}
  font-size: 16px;

  p {
    margin-bottom: 1em;
    line-height: 1.4;
  }
`
