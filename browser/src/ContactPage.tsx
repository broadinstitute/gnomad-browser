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
      <ExternalLink href="http://broad.io/2024_survey">our user survey</ExternalLink>.
    </p>

    <p>
      Use the gnomAD{' '}
      {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href="https://discuss.gnomad.broadinstitute.org/new-topic?category=General">
        Forum
      </ExternalLink>{' '}
      to request help, discuss the data, and ask questions.*
    </p>

    <p>
      Report errors in the website on{' '}
      {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href="https://github.com/broadinstitute/gnomad-browser/issues/new?labels=Type%3A%20Bug">
        GitHub
      </ExternalLink>{' '}
      or the{' '}
      {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href="https://discuss.gnomad.broadinstitute.org/new-topic?category=Browser&tags=bug">
        Forum
      </ExternalLink>
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

    <br />
    <p>
      *Alternately, you can{' '}
      {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href="mailto:gnomad@broadinstitute.org">email us</ExternalLink>. Please note
      that we prioritize answering issues on Github and topics on the Forum, so if you choose to
      email it may take us longer to respond.
    </p>
  </InfoPage>
)
