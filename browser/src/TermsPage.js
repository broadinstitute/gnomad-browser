import React from 'react'

import { PageHeading } from '@gnomad/ui'

import termsContent from '../about/terms.md'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'
import MarkdownContent from './MarkdownContent'

export default () => (
  <InfoPage>
    <DocumentTitle title="Terms and Data Information" />
    <PageHeading>Terms and Data Information</PageHeading>

    <MarkdownContent dangerouslySetInnerHTML={{ __html: termsContent.html }} />
  </InfoPage>
)
