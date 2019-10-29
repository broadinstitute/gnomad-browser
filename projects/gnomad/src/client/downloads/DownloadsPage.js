import React from 'react'

import { PageHeading, ExternalLink, Tabs } from '@broad/ui'

import DocumentTitle from '../DocumentTitle'
import InfoPage from '../InfoPage'

import GnomadV2Downloads from './GnomadV2Downloads'
import GnomadV2LiftoverDownloads from './GnomadV2LiftoverDownloads'
import GnomadV3Downloads from './GnomadV3Downloads'

export default () => (
  <InfoPage>
    <DocumentTitle title="Downloads" />
    <PageHeading>Downloads</PageHeading>
    <p>gnomAD is available for download in Hail Table (.ht) and VCF formats.</p>

    <p>
      Files can be browsed and downloaded in parallel using{' '}
      <ExternalLink href="https://cloud.google.com/storage/docs/gsutil">gsutil</ExternalLink>. After
      installing gsutil, start browsing with <code>gsutil ls gs://gnomad-public/release</code>.
    </p>

    <p>
      To work efficiently with gnomAD, we recommend using{' '}
      <ExternalLink href="https://hail.is/">Hail</ExternalLink> and our{' '}
      <ExternalLink href="https://github.com/macarthur-lab/gnomad_hail">
        Hail utilities for gnomAD
      </ExternalLink>
      .
    </p>
    <Tabs
      tabs={[
        {
          id: 'v2',
          label: 'gnomAD v2',
          render: () => <GnomadV2Downloads />,
        },
        {
          id: 'v2_liftover',
          label: 'gnomAD v2 liftover',
          render: () => <GnomadV2LiftoverDownloads />,
        },
        {
          id: 'v3',
          label: 'gnomAD v3',
          render: () => <GnomadV3Downloads />,
        },
      ]}
    />
  </InfoPage>
)
