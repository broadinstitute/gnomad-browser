import React from 'react'

import { ExternalLink, PageHeading } from '@gnomad/ui'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'

export default () => (
  <InfoPage>
    <DocumentTitle title="Contact" />
    <PageHeading>Contact</PageHeading>
    <p>
      Report data problems or feature suggestions by{' '}
      <ExternalLink href="mailto:exomeconsortium@gmail.com">email</ExternalLink>.
    </p>

    <p>
      Report errors in the website on{' '}
      <ExternalLink href="https://github.com/broadinstitute/gnomad-browser/issues">
        GitHub
      </ExternalLink>{' '}
      or by <ExternalLink href="mailto:exomeconsortium@gmail.com">email</ExternalLink>.
    </p>

    <p>
      Sign up for our low-volume{' '}
      <ExternalLink href="https://groups.google.com/forum/#!forum/exac_data_announcements">
        mailing list
      </ExternalLink>{' '}
      for future release announcements.
    </p>
  </InfoPage>
)
