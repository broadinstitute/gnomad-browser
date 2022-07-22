import React, { useLayoutEffect, useState } from 'react'
import styled from 'styled-components'

import { ExternalLink, PageHeading, Tabs } from '@gnomad/ui'

import DocumentTitle from '../DocumentTitle'
import InfoPage from '../InfoPage'
import Link from '../Link'

import GnomadV2Downloads from './GnomadV2Downloads'
import GnomadV2LiftoverDownloads from './GnomadV2LiftoverDownloads'
import GnomadV3Downloads from './GnomadV3Downloads'
import ExacDownloads from './ExacDownloads'

const CodeBlock = styled.code`
  display: inline-block;
  overflow-x: scroll;
  box-sizing: border-box;
  max-width: 100%;
  padding: 0.5em 1em;
  border-radius: 0.25em;
  background: #333;
  color: #fafafa;
  font-family: monospace;
  line-height: 1.6;
  white-space: nowrap;

  &::before {
    content: '$ ';
  }
`

type Props = {
  location: {
    hash: string
  }
}

const DownloadsPage = ({ location }: Props) => {
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
      <p>
        gnomAD data is available for download through{' '}
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://cloud.google.com/public-datasets">
          Google Cloud Public Datasets
        </ExternalLink>
        , the{' '}
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://registry.opendata.aws/">
          Registry of Open Data on AWS
        </ExternalLink>
        , and{' '}
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://azure.microsoft.com/en-us/services/open-datasets/">
          Azure Open Datasets
        </ExternalLink>
        .
      </p>

      <p>
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        We recommend using <ExternalLink href="https://hail.is/">Hail</ExternalLink> and our{' '}
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://github.com/broadinstitute/gnomad_methods">
          Hail utilities for gnomAD
        </ExternalLink>{' '}
        to work with the data.
      </p>

      <p>
        In addition to the files listed below,{' '}
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://terra.bio">Terra</ExternalLink> has{' '}
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://terra.bio/a-demo-workspace-for-working-with-gnomad-data-in-terra/">
          a demo workspace for working with gnomAD data
        </ExternalLink>
        .
      </p>

      <h3>Google Cloud Public Datasets</h3>

      <p>
        Files can be browsed and downloaded using{' '}
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://cloud.google.com/storage/docs/gsutil">gsutil</ExternalLink>.
      </p>

      <p>
        <CodeBlock>gsutil ls gs://gcp-public-data--gnomad/release/</CodeBlock>
      </p>

      <p>
        gnomAD variants are also available as a{' '}
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://console.cloud.google.com/marketplace/product/broad-institute/gnomad">
          BigQuery dataset
        </ExternalLink>
        .
      </p>

      <em>
        Please note, this BigQuery dataset is maintained entirely by Google. The gnomAD team has no
        ability to provide a consistent experience in BigQuery.
      </em>

      <h3>Registry of Open Data on AWS</h3>

      <p>
        Files can be browsed and downloaded using the{' '}
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://docs.aws.amazon.com/cli/">
          AWS Command Line Interface
        </ExternalLink>
        .
      </p>

      <p>
        <CodeBlock>aws s3 ls s3://gnomad-public-us-east-1/release/</CodeBlock>
      </p>

      <h3>Azure Open Datasets</h3>

      <p>
        Files can be browsed and downloaded using{' '}
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://docs.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10">
          AzCopy
        </ExternalLink>{' '}
        or{' '}
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://azure.microsoft.com/en-us/features/storage-explorer/">
          Azure Storage Explorer
        </ExternalLink>
        .
      </p>

      <p>
        <CodeBlock>azcopy ls https://datasetgnomad.blob.core.windows.net/dataset/</CodeBlock>
      </p>

      <p>
        gnomAD variants are also available in Parquet format.{' '}
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://docs.microsoft.com/en-us/azure/open-datasets/dataset-gnomad">
          Find more information on the Azure website
        </ExternalLink>
        .
      </p>

      <h3>Downloads</h3>

      <p>
        See
        <Link to="/help/whats-the-difference-between-gnomad-v2-and-v3">
          &ldquo;What&apos;s the difference between gnomAD v2 and v3?&rdquo;
        </Link>{' '}
        to decide which version is right for you.
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

export default DownloadsPage
