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
      <ExternalLink href="http://broad.io/2024_survey">our user survey</ExternalLink>.
    </p>

    <p>
      Use the gnomAD{' '}
      <ExternalLink href="https://discuss.gnomad.broadinstitute.org/new-topic?category=General">
        Forum
      </ExternalLink>{' '}
      to request help, discuss the data, and ask questions.*
    </p>

    <p>
      Report errors in the website on{' '}
      <ExternalLink href="https://github.com/broadinstitute/gnomad-browser/issues/new?labels=Type%3A%20Bug">
        GitHub
      </ExternalLink>{' '}
      or the{' '}
      <ExternalLink href="https://discuss.gnomad.broadinstitute.org/new-topic?category=Browser&tags=bug">
        Forum
      </ExternalLink>
    </p>

    <p>
      For questions about gnomAD, check out the <ExternalLink href="/help">help page</ExternalLink>.
    </p>

    <p>
      Note that, for many reasons (including consent and data usage restrictions), we do not have
      (and cannot share) phenotype information. Overall, we have limited information that we can
      share for some cohorts, such as last known age in bins of 5 years (when known) and chromosomal
      sex.
    </p>

    <p>
      <ExternalLink href="https://www.linkedin.com/company/gnomad-project">
        Follow us on LinkedIn
      </ExternalLink>
      .
    </p>

    <br />
    <p>
      *Alternately, you can{' '}
      <ExternalLink href="mailto:gnomad@broadinstitute.org">email us</ExternalLink>. We prioritize
      questions on GitHub and the{' '}
      <ExternalLink href="https://discuss.gnomad.broadinstitute.org">forum</ExternalLink>, so email
      responses may take longer; consider cross-posting your question on the forum if you&apos;d
      like a faster reply.
    </p>
  </InfoPage>
)
