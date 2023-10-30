import React from 'react'
import styled from 'styled-components'

import { ExternalLink, Page, ListItem } from '@gnomad/ui'
import Link from '../Link'

import { DatasetId, labelForDataset } from '@gnomad/dataset-metadata/metadata'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import Query from '../Query'
import { variantFeedbackUrl } from '../variantFeedback'
import CopyNumberVariantAttributeList from './CopyNumberVariantAttributeList'
import CopyNumberVariantPopulationsTable from './CopyNumberVariantPopulationsTable'
import CNVReferenceList from './CNVReferenceList'

const Wrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
`

const ResponsiveSection = styled.section`
  width: calc(50% - 15px);

  @media (max-width: 992px) {
    width: 100%;
  }
`

export type CopyNumberVariant = {
  alts: string[] | null
  sc: number
  sn: number
  sf: number
  chrom: string
  end: number
  filters: string[]
  genes: string[]
  length: number
  populations: {
    id: string
    sc: number
    sn: number
    sf: number
  }[]
  pos: number
  qual: number
  type: string
  posmin: number
  posmax: number
  endmin: number
  endmax: number
  variant_id: string
}

type CopyNumberVariantPageProps = {
  datasetId: DatasetId
  variant: CopyNumberVariant
}

const CopyNumberVariantPage = ({ datasetId, variant }: CopyNumberVariantPageProps) => (
  // @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
  <Page>
    <DocumentTitle title={`${variant.variant_id} | ${labelForDataset(datasetId)}`} />
    <GnomadPageHeading
      datasetOptions={{ includeShortVariants: false, includeStructuralVariants: false }}
      selectedDataset={datasetId}
    >
      Copy number variant: {variant.variant_id}
    </GnomadPageHeading>
    <Wrapper>
      <ResponsiveSection>
        <CopyNumberVariantAttributeList variant={variant} />
      </ResponsiveSection>
      <ResponsiveSection>
        <h2>External Resources</h2>
        <CNVReferenceList variant={variant} />
        <h2>Feedback</h2>
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href={variantFeedbackUrl(variant, datasetId)}>
          Report an issue with this variant
        </ExternalLink>
      </ResponsiveSection>
    </Wrapper>

    <section>
      <h2>Population Frequencies</h2>
      <CopyNumberVariantPopulationsTable variant={variant} />
    </section>

    <Wrapper>
      <ResponsiveSection>
        <h2>Consequences</h2>
        <p>
          This variant has consequences in {variant.genes.length} gene
          {variant.genes.length !== 1 && 's'}.
        </p>
        {variant.genes.map((gene) => (
          // @ts-expect-error TS(2769) FIXME: No overload matches this call.
          <ListItem key={gene}>
            <Link to={`/gene/${gene}`}>{gene}</Link>
          </ListItem>
        ))}
      </ResponsiveSection>
    </Wrapper>
  </Page>
)

type ConnectedCopyNumberVariantPageProps = {
  datasetId: DatasetId
  variantId: string
}

const ConnectedCopyNumberVariantPage = ({
  datasetId,
  variantId,
}: ConnectedCopyNumberVariantPageProps) => {
  const operationName = 'CopyNumberVariant'

  const query = `
    query ${operationName}($datasetId: CopyNumberVariantDatasetId!, $variantId: String!) {
      copy_number_variant(dataset: $datasetId, variantId: $variantId) {
        alts
        sc
        sn
        sf
        chrom
        end
        filters
        genes
        length
        populations {
            id
            sc
            sn
            sf
        }
        pos
        qual
        reference_genome
        type
        posmin
        posmax
        endmin
        endmax
        variant_id
      }
    }
  `

  return (
    <Query
      operationName={operationName}
      query={query}
      variables={{ datasetId, variantId }}
      loadingMessage="Loading variant"
      errorMessage="Unable to load variant"
      success={(data: any) => data.copy_number_variant}
    >
      {({ data }: any) => {
        const variant = {
          ...data.copy_number_variant,
          variant_id: data.copy_number_variant.variant_id,
        }
        return <CopyNumberVariantPage datasetId={datasetId} variant={variant} />
      }}
    </Query>
  )
}

export default ConnectedCopyNumberVariantPage
