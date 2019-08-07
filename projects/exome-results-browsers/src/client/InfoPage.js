import React from 'react'
import styled from 'styled-components'

import { Page, PageHeading } from '@broad/ui'

import * as pages from '@browser/pages'

import DocumentTitle from './DocumentTitle'

const Wrapper = styled(Page)`
  font-size: 16px;

  p {
    margin-bottom: 1em;
    line-height: 1.4;
  }
`

export const makePage = ({ heading, component }) => {
  const Component = pages[component]
  const PageComponent = () => (
    <Wrapper>
      <DocumentTitle />
      <PageHeading>{heading}</PageHeading>
      <Component />
    </Wrapper>
  )

  return PageComponent
}
