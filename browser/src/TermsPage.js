import React from 'react'

import { PageHeading } from '@gnomad/ui'

import termsContent from '../about/terms.md'

import DocumentTitle from './DocumentTitle'
import HelpContent from './help/HelpContent'
import InfoPage from './InfoPage'

export default () => (
  <InfoPage>
    <DocumentTitle title="Terms and Data Information" />
    <PageHeading>Terms and Data Information</PageHeading>

    <HelpContent dangerouslySetInnerHTML={{ __html: termsContent.html }} />
  </InfoPage>
)
