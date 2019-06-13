import React from 'react'
import styled from 'styled-components'

import { Page } from '@broad/ui'

import HomePageContent from '@browser/HomePageContent'

import DocumentTitle from './DocumentTitle'

const HomePageWrapper = styled(Page)`
  font-size: 16px;

  p {
    margin: 0 0 1.5em;
    line-height: 1.5;
  }
`

const HomePage = () => (
  <HomePageWrapper>
    <DocumentTitle />
    <HomePageContent />
  </HomePageWrapper>
)

export default HomePage
