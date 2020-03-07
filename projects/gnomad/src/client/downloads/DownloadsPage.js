import PropTypes from 'prop-types'
import React, { useLayoutEffect, useState } from 'react'

import { PageHeading, ExternalLink, Tabs } from '@gnomad/ui'

import DocumentTitle from '../DocumentTitle'
import InfoPage from '../InfoPage'

import GnomadV2Downloads from './GnomadV2Downloads'
import GnomadV2LiftoverDownloads from './GnomadV2LiftoverDownloads'
import GnomadV3Downloads from './GnomadV3Downloads'
import ExacDownloads from './ExacDownloads'

const DownloadsPage = ({ location }) => {
  const [activeTab, setActiveTab] = useState('v2')
  // Use useLayoutEffect instead of useEffect so that the tab gets updated before
  // the anchor referenced in the hash gets scrolled into view.
  // (the code that handles that scrolling is in routes.js)
  useLayoutEffect(() => {
    if (location.hash.startsWith('#v2-liftover-')) {
      setActiveTab('v2-liftover')
    } else if (location.hash.startsWith('#v3-')) {
      setActiveTab('v3')
    } else if (location.hash.startsWith('#exac-')) {
      setActiveTab('exac')
    }
  }, [location.hash])

  return (
    <InfoPage>
      <DocumentTitle title="Downloads" />
      <PageHeading>Downloads</PageHeading>
      <p>gnomAD is available for download in Hail Table (.ht) and VCF formats.</p>

      <p>
        Files can be browsed and downloaded in parallel using{' '}
        <ExternalLink href="https://cloud.google.com/storage/docs/gsutil">gsutil</ExternalLink>.
        After installing gsutil, start browsing with{' '}
        <code>gsutil ls gs://gnomad-public/release</code>.
      </p>

      <p>
        To work efficiently with gnomAD, we recommend using{' '}
        <ExternalLink href="https://hail.is/">Hail</ExternalLink> and our{' '}
        <ExternalLink href="https://github.com/broadinstitute/gnomad_methods">
          Hail utilities for gnomAD
        </ExternalLink>
        .
      </p>
      <Tabs
        activeTabId={activeTab}
        tabs={[
          {
            id: 'v2',
            label: 'gnomAD v2',
            render: () => <GnomadV2Downloads />,
          },
          {
            id: 'v2-liftover',
            label: 'gnomAD v2 liftover',
            render: () => <GnomadV2LiftoverDownloads />,
          },
          {
            id: 'v3',
            label: 'gnomAD v3',
            render: () => <GnomadV3Downloads />,
          },
          {
            id: 'exac',
            label: 'ExAC',
            render: () => <ExacDownloads />,
          },
        ]}
        onChange={setActiveTab}
      />
    </InfoPage>
  )
}

DownloadsPage.propTypes = {
  location: PropTypes.shape({
    hash: PropTypes.string.isRequired,
  }).isRequired,
}

export default DownloadsPage
