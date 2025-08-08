import React from 'react'

import { ExternalLink, PageHeading } from '@gnomad/ui'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'

export default () => (
  <InfoPage>
    <DocumentTitle title="Contact" />
    <PageHeading>Contact</PageHeading>

    <p>
      Report OurDNA browser errors via GitHub{' '}
       {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href="https://github.com/populationgenomics/ourdna-browser/issues">
        GitHub.
      </ExternalLink>
    </p>
    {/* <p>
      For questions about the OurDNA dataset, please see our{' '}
      <Link to="/news">blog</Link>.
    </p> */}
    <p>
      Follow us on Instagram{' '}
       {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href="https://www.instagram.com/ourdna_australia/">@ourdna_australia </ExternalLink>
      and{' '}
      {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href="https://www.facebook.com/people/Our-DNA/61563734916751/">Facebook</ExternalLink>.
    </p>
    <p>
      For all other questions, please{' '}
      {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href="mailto:servicedesk@populationgenomics.com">email us</ExternalLink>.
    </p>
  </InfoPage>
)
