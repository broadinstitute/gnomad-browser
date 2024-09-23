import React from 'react'
import styled from 'styled-components'

import { ExternalLink, PageHeading } from '@gnomad/ui'

import Link from '../Link'

import DocumentTitle from '../DocumentTitle'
import InfoPage from '../InfoPage'

import { SectionTitle, StyledParagraph, CodeBlock } from './downloadsPageStyles'

import DataPageTableOfContents from './TableOfContents'

// @ts-expect-error
import styles from './DataPage.module.css'

import GnomadV4Downloads from './GnomadV4Downloads'
import GnomadV3Downloads from './GnomadV3Downloads'
import GnomadV2Downloads from './GnomadV2Downloads'
import GnomadV2LiftoverDownloads from './GnomadV2LiftoverDownloads'
import ExacDownloads from './ExacDownloads'
import GraphQLDocs from './GraphQLDocs'

const TextSection = styled.div`
  width: 70%;

  @media (max-width: 900px) {
    width: 100%;
  }
`

const TableOfContentsSection = styled.div`
  /* stylelint-disable-next-line value-no-vendor-prefix */
  position: -webkit-sticky;
  position: sticky;
  top: 1rem;
  width: 25%;
  float: right;
  padding-bottom: 1rem;
  border-left: 1px solid lightgrey;

  @media (max-width: 900px) {
    display: none;
  }
`

const BottomSpacer = styled.div`
  margin-bottom: 40rem;
`

const DataPage = () => {
  // Load stylesheet to make smooth scroll behavior active
  const _style = styles.html

  return (
    <InfoPage>
      <DocumentTitle title="Data" />
      <PageHeading>Data</PageHeading>

      <TableOfContentsSection>
        <DataPageTableOfContents />
      </TableOfContentsSection>

      <TextSection>
        <div>
          <SectionTitle id="summary" theme={{ type: 'datasets' }}>
            Summary
          </SectionTitle>
          <StyledParagraph>
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
            . We recommend using{' '}
            {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
            <ExternalLink href="https://hail.is/">Hail</ExternalLink> and our{' '}
            {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
            <ExternalLink href="https://github.com/broadinstitute/gnomad_methods">
              Hail utilities for gnomAD
            </ExternalLink>{' '}
            to work with this data.
          </StyledParagraph>
          <StyledParagraph>
            In addition to the files listed below,{' '}
            {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
            <ExternalLink href="https://terra.bio">Terra</ExternalLink> has{' '}
            {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
            <ExternalLink href="https://terra.bio/a-demo-workspace-for-working-with-gnomad-data-in-terra/">
              a demo workspace for working with gnomAD data
            </ExternalLink>
            .
          </StyledParagraph>
          <StyledParagraph>
            The API used by the gnomAD browser is also open to the public. In use cases involving
            querying a relatively small number of records with low latency, using the API to request
            records as needed may be more suitable than working with downloaded gnomAD data. If
            you&apos;re unsure which would be better for your use case, please reach out to the
            browser team on the{' '}
            {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
            <ExternalLink href="https://discuss.gnomad.broadinstitute.org/">
              gnomAD forum
            </ExternalLink>
            .
          </StyledParagraph>
          <h2>Download Overview</h2>
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

          <StyledParagraph>
            <em>
              Please note, this BigQuery dataset is maintained entirely by Google. The gnomAD team
              has no ability to provide a consistent experience in BigQuery.
            </em>
          </StyledParagraph>

          <h3>Registry of Open Data on AWS</h3>

          <p>
            Files can be browsed and downloaded using the{' '}
            {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
            <ExternalLink href="https://docs.aws.amazon.com/cli/">
              AWS Command Line Interface
            </ExternalLink>
            .
          </p>

          <StyledParagraph>
            <CodeBlock>aws s3 ls s3://gnomad-public-us-east-1/release/</CodeBlock>
          </StyledParagraph>

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

          <StyledParagraph>
            gnomAD variants are also available in Parquet format.{' '}
            {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
            <ExternalLink href="https://docs.microsoft.com/en-us/azure/open-datasets/dataset-gnomad">
              Find more information on the Azure website
            </ExternalLink>
            .
          </StyledParagraph>

          <h3>Downloads</h3>
          <StyledParagraph>
            See{' '}
            <Link to="/help/whats-the-difference-between-the-different-versions-of-gnomad">
              &ldquo;What&apos;s the difference between different versions of gnomad?&rdquo;
            </Link>{' '}
            to decide which version is right for you.
          </StyledParagraph>

          <h3>Core Dataset vs Secondary Analyses</h3>
          <StyledParagraph>
            Within a versioned release, datasets available for download fall under two categories.
            The Core Dataset is the gnomAD database and analyses created and maintained by the{' '}
            {/* @ts-expect-error */}
            <ExternalLink href="https://gnomad.broadinstitute.org/team#production-staff">
              gnomAD production team
            </ExternalLink>
            . Secondary Analyses are additional analyses developed in collaboration with
            laboratories of the {/* @ts-expect-error */}
            <ExternalLink href="https://gnomad.broadinstitute.org/team#steering-committee">
              gnomAD steering committee
            </ExternalLink>
            .
          </StyledParagraph>
        </div>

        <hr />

        <GnomadV4Downloads />

        <GnomadV3Downloads />

        <GnomadV2LiftoverDownloads />

        <GnomadV2Downloads />

        <ExacDownloads />

        <GraphQLDocs />

        <BottomSpacer />
      </TextSection>
    </InfoPage>
  )
}

export default DataPage
