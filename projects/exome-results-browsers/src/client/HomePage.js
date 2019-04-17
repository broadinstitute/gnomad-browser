import React from 'react'

import { Page } from '@broad/ui'

import HomePageContent from '@browser/HomePageContent'

import DocumentTitle from './DocumentTitle'

const HomePage = () => (
  <Page>
    <DocumentTitle />
    <HomePageContent />
  </Page>
)

export default HomePage
