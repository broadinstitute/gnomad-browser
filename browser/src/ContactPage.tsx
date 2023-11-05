import React from 'react'

import { ExternalLink, PageHeading } from '@gnomad/ui'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'

export default () => (
  <InfoPage>
    <DocumentTitle title="Contact" />
    <PageHeading>Contact</PageHeading>

    <p>
      Tell us how you use gnomAD and your wish list by filling out{' '}
      {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href="http://broad.io/gnomad_user_survey">our user survey</ExternalLink>.
    </p>

    <p>
      Report data problems or feature suggestions by{' '}
      {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href="mailto:gnomad@broadinstitute.org">email</ExternalLink>.
    </p>

    <p>
      Report errors in the website on{' '}
      {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href="https://github.com/broadinstitute/gnomad-browser/issues">
        GitHub
      </ExternalLink>
      .
    </p>

    <p>
      For questions about gnomAD, check out the{' '}
      {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href="/help">help page</ExternalLink>.
    </p>

    <p>
      Note that, for many reasons (including consent and data usage restrictions), we do not have
      (and cannot share) phenotype information. Overall, we have limited information that we can
      share for some cohorts, such as last known age in bins of 5 years (when known) and chromosomal
      sex.
    </p>

    <p>
      Follow us on Twitter{' '}
      {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href="https://twitter.com/gnomad_project">@gnomad_project</ExternalLink>.
    </p>
  </InfoPage>
)
