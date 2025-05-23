import React from 'react'
import styled from 'styled-components'

import { ExternalLink, Page } from '@gnomad/ui'

import { DatasetId, labelForDataset } from '@gnomad/dataset-metadata/metadata'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import { Histogram } from '../VariantPage/VariantPage'
import InfoButton from '../help/InfoButton'
import Query from '../Query'
import { variantFeedbackUrl } from '../variantFeedback'
import MultiallelicCopyNumberVariantPlot from './MultiallelicCopyNumberVariantPlot'
import StructuralVariantAgeDistribution from './StructuralVariantAgeDistribution'
import StructuralVariantAttributeList from './StructuralVariantAttributeList'
import StructuralVariantConsequenceList from './StructuralVariantConsequenceList'
import StructuralVariantGenotypeQualityMetrics from './StructuralVariantGenotypeQualityMetrics'
import StructuralVariantPopulationsTable from './StructuralVariantPopulationsTable'
import SVReferenceList from './SVReferenceList'

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

// NB that this type corresponds to the GraphQL schema for StructuralVariantDetails, rather than the GraphQL version of StructuralVariant. However, we can use the same type on this end for both, since StructuralVariantDetails is a superset of
export type StructuralVariant = {
  age_distribution: {
    het: Histogram
    hom: Histogram
  } | null
  algorithms: string[] | null
  alts: string[] | null
  ac: number
  an: number
  af: number
  homozygote_count: number | null
  hemizygote_count: number | null
  chrom: string
  chrom2: string | null
  major_consequence: string | null
  consequences:
    | {
        consequence: string
        genes: string[] | null
      }[]
    | null
  copy_numbers:
    | {
        copy_number: number
        ac: number
      }[]
    | null
  cpx_intervals: string[] | null
  cpx_type: string | null
  end: number
  end2: number | null
  evidence: string[] | null
  filters: string[] | null
  genes: string[] | null
  genotype_quality: {
    all: Histogram | null
    alt: Histogram | null
  } | null
  length: number | null
  populations:
    | {
        id: string
        ac: number
        an: number
        homozygote_count: number | null
        hemizygote_count: number | null
        ac_hemi: number | null
        ac_hom: number | null
      }[]
    | null
  pos: number
  pos2: number | null
  qual: number | null
  type: string | null
  variant_id: string
  consequence: string | null
  ac_hom: number | null
  ac_hemi: number | null
}

type StructuralVariantPageProps = {
  datasetId: DatasetId
  variant: StructuralVariant
}

const StructuralVariantPage = ({ datasetId, variant }: StructuralVariantPageProps) => {
  const genes = variant.genes || []
  return (
    // @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
    <Page>
      <DocumentTitle title={`${variant.variant_id} | ${labelForDataset(datasetId)}`} />
      <GnomadPageHeading
        datasetOptions={{ includeShortVariants: false }}
        selectedDataset={datasetId}
      >
        Structural variant: {variant.variant_id}
      </GnomadPageHeading>
      <Wrapper>
        <ResponsiveSection>
          <StructuralVariantAttributeList variant={variant} />
        </ResponsiveSection>
        <ResponsiveSection>
          <h2>External Resources</h2>
          <SVReferenceList variant={variant} datasetId={datasetId} />
          <h2>Feedback</h2>
          <ExternalLink href={variantFeedbackUrl(variant, datasetId)}>
            Report an issue with this variant
          </ExternalLink>
        </ResponsiveSection>
      </Wrapper>

      <section>
        <h2>Genetic Ancestry Group Frequencies</h2>
        <StructuralVariantPopulationsTable variant={variant} />
      </section>

      {variant.type === 'MCNV' && (
        <Wrapper>
          <ResponsiveSection>
            <h2>Copy Number Distribution</h2>
            <MultiallelicCopyNumberVariantPlot variant={variant} />
          </ResponsiveSection>
        </Wrapper>
      )}

      <Wrapper>
        <ResponsiveSection>
          <h2>Consequences</h2>
          <p>
            This variant has consequences in {genes.length} gene
            {genes.length !== 1 && 's'}.
          </p>
          <StructuralVariantConsequenceList variant={variant} />
        </ResponsiveSection>
      </Wrapper>

      <Wrapper>
        <ResponsiveSection>
          <h2>Genotype Quality</h2>
          {variant.genotype_quality ? (
            <StructuralVariantGenotypeQualityMetrics variant={variant} />
          ) : (
            <p>Genotype quality is unavailable for this variant.</p>
          )}
        </ResponsiveSection>

        <ResponsiveSection>
          <h2>
            Age Distribution <InfoButton topic="age" />
          </h2>
          {variant.age_distribution ? (
            <React.Fragment>
              {datasetId !== 'gnomad_sv_r2_1' && (
                <p>Age distribution is based on the full SV dataset, not the selected subset.</p>
              )}
              <StructuralVariantAgeDistribution variant={variant} />
            </React.Fragment>
          ) : (
            <p>Age data is not available for this variant.</p>
          )}
        </ResponsiveSection>
      </Wrapper>
    </Page>
  )
}

type ConnectedStructuralVariantPageProps = {
  datasetId: DatasetId
  variantId: string
}

const ConnectedStructuralVariantPage = ({
  datasetId,
  variantId,
}: ConnectedStructuralVariantPageProps) => {
  const operationName = 'StructuralVariant'
  const query = `
    query ${operationName}($datasetId: StructuralVariantDatasetId!, $variantId: String!) {
      structural_variant(dataset: $datasetId, variantId: $variantId) {
        age_distribution {
          het {
            bin_edges
            bin_freq
            n_smaller
            n_larger
          }
          hom {
            bin_edges
            bin_freq
            n_smaller
            n_larger
          }
        }
        algorithms
        alts
        ac
        an
        chrom
        chrom2
        consequences {
          consequence
          genes
        }
        copy_numbers {
          copy_number
          ac
        }
        cpx_intervals
        cpx_type
        end
        end2
        evidence
        filters
        genes
        genotype_quality {
          all {
            bin_edges
            bin_freq
            n_smaller
            n_larger
          }
          alt {
            bin_edges
            bin_freq
            n_smaller
            n_larger
          }
        }
        length
        populations {
          id
          ac
          an
          ac_hemi
          ac_hom
        }
        pos
        pos2
        qual
        type
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
      success={(data: any) => data.structural_variant}
    >
      {({ data }: any) => {
        const variant = {
          ...data.structural_variant,
          variant_id: data.structural_variant.variant_id.toUpperCase(),
        }
        return <StructuralVariantPage datasetId={datasetId} variant={variant} />
      }}
    </Query>
  )
}

export default ConnectedStructuralVariantPage
