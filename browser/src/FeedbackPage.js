import React from 'react'

import { ExternalLink, PageHeading } from '@gnomad/ui'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'

export default () => (
  <InfoPage>
    <DocumentTitle title="Feedback" />
    <PageHeading>Feedback</PageHeading>

    <p>
      Tell us how you use gnomAD and your wish list by filling out{' '}
      <ExternalLink href="http://broad.io/gnomad_user_survey">our user survey</ExternalLink>.
    </p>

    <p>
      Report data problems or feature suggestions by{' '}
      <ExternalLink href="mailto:gnomad@broadinstitute.org">email</ExternalLink>.
    </p>

    <p>
      Report errors in the website on{' '}
      <ExternalLink href="https://github.com/broadinstitute/gnomad-browser/issues">
        GitHub
      </ExternalLink>{' '}
      or by <ExternalLink href="mailto:gnomad@broadinstitute.org">email</ExternalLink>.
    </p>

    <p>
      Follow us on Twitter{' '}
      <ExternalLink href="https://twitter.com/gnomad_project">@gnomad_project</ExternalLink>.
    </p>
  </InfoPage>
)
