import React from 'react'
import styled from 'styled-components'

import { Page, PageHeading } from '@broad/ui'

import * as pages from '@browser/pages'

import DocumentTitle from './DocumentTitle'

const InfoPage = styled(Page)`
  font-size: 16px;

  p {
    margin-bottom: 1em;
    line-height: 1.4;
  }
`

export default InfoPage

export const makePage = ({ heading, component }) => {
  const Component = pages[component]
  const PageComponent = () => (
    <InfoPage>
      <DocumentTitle />
      <PageHeading>{heading}</PageHeading>
      <Component />
    </InfoPage>
  )

  return PageComponent
}
