import React from 'react'

import { ExternalLink, PageHeading } from '@broad/ui'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'

export default () => (
  <InfoPage>
    <DocumentTitle title="Contact" />
    <PageHeading>Contact</PageHeading>
    <p>
      Errors in the website can be{' '}
      <ExternalLink href="https://github.com/macarthur-lab/gnomadjs/issues">
        reported via Github
      </ExternalLink>
      .
    </p>

    <p>
      You can also contact us by{' '}
      <ExternalLink href="mailto:exomeconsortium@gmail.com">email</ExternalLink> to report data
      problems or feature suggestions.
    </p>

    <p>
      Sign up for our low-volume mailing list for future release announcements{' '}
      <ExternalLink href="https://groups.google.com/forum/#!forum/exac_data_announcements">
        here
      </ExternalLink>
      .
    </p>
  </InfoPage>
)
