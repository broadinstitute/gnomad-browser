import React from 'react'

import { Page, PageHeading } from '@broad/ui'

import DocumentTitle from './DocumentTitle'
import Link from './Link'

const PageNotFoundPage = () => (
  <Page>
    <DocumentTitle title="Not Found" />
    <PageHeading>Page Not Found</PageHeading>
    <p>
      This page does not exist. Try searching for a gene or go to the <Link to="/">home page</Link>.
    </p>
  </Page>
)

export default PageNotFoundPage
