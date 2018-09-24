import React from 'react'
import styled from 'styled-components'

import { Page } from '@broad/ui'

import HomePageContent from '@browser-components/HomePageContent'

const HomePageWrapper = styled.section`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  margin: 80px 50px 50px;
`

const HomePage = () => (
  <Page>
    <HomePageContent />
  </Page>
)

export default HomePage
