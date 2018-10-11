import React from 'react'

import { ExternalLink, PageHeading, SectionHeading } from '@broad/ui'

import InfoPage from './InfoPage'
import Link from './Link'

export default () => (
  <InfoPage>
    <PageHeading>gnomAD Browser</PageHeading>

    <SectionHeading>About gnomAD</SectionHeading>
    <p>
      The <Link to="/about">Genome Aggregation Database</Link> (gnomAD) is a resource developed by
      an international coalition of investigators, with the goal of aggregating and harmonizing both
      exome and genome sequencing data from a wide variety of large-scale sequencing projects, and
      making summary data available for the wider scientific community.
    </p>
    <p>
      The data set provided on this website spans 123,136 exome sequences and 15,496 whole-genome
      sequences from unrelated individuals sequenced as part of various disease-specific and
      population genetic studies. The gnomAD Principal Investigators and groups that have
      contributed data to the current release are listed <Link to="/about">here</Link>.
    </p>
    <p>
      All data here are released for the benefit of the wider biomedical community, without
      restriction on use - see the terms of use <Link to="/terms">here</Link>.
    </p>
    <p>
      Sign up for our mailing list for future release announcements{' '}
      <ExternalLink href="https://groups.google.com/forum/#!forum/exac_data_announcements">
        here
      </ExternalLink>
      .
    </p>
  </InfoPage>
)
