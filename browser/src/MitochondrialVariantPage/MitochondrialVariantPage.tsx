import React from 'react'
import styled from 'styled-components'

import { Badge, ExternalLink, Page } from '@gnomad/ui'

import { labelForDataset, referenceGenomeForDataset } from '../datasets'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import InfoButton from '../help/InfoButton'
import Link from '../Link'
import Query from '../Query'
import StatusMessage from '../StatusMessage'
import TableWrapper from '../TableWrapper'
import { variantFeedbackUrl } from '../variantFeedback'
import VariantClinvarInfo from '../VariantPage/VariantClinvarInfo'
import MitochondrialVariantAgeDistribution from './MitochondrialVariantAgeDistribution'
import MitochondrialVariantAttributeList from './MitochondrialVariantAttributeList'
import MitochondrialVariantDetailPropType from './MitochondrialVariantDetailPropType'
import MitochondrialVariantGenotypeQualityMetrics from './MitochondrialVariantGenotypeQualityMetrics'
import MitochondrialVariantHaplogroupFrequenciesTable from './MitochondrialVariantHaplogroupFrequenciesTable'
import MitochondrialVariantHeteroplasmyDistribution from './MitochondrialVariantHeteroplasmyDistribution'
import MitochondrialVariantPopulationFrequenciesTable from './MitochondrialVariantPopulationFrequenciesTable'
import MitochondrialVariantReferenceList from './MitochondrialVariantReferenceList'
import MitochondrialVariantSiteQualityMetrics from './MitochondrialVariantSiteQualityMetrics'
import MitochondrialVariantTranscriptConsequenceList from './MitochondrialVariantTranscriptConsequenceList'

const Wrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  margin-bottom: 1em;
`

const Section = styled.section`
  width: 100%;
  margin-bottom: 1em;
`

const ResponsiveSection = styled.section`
  width: calc(50% - 15px);

  @media (max-width: 992px) {
    width: 100%;
  }
`

const VariantType = ({ variantId }: any) => {
  const [chrom, pos, ref, alt] = variantId.split('-') // eslint-disable-line no-unused-vars
  if (!ref || !alt) {
    return 'Variant'
  }
  if (ref.length === 1 && alt.length === 1) {
    return 'Single nucleotide variant'
  }
  if (ref.length < alt.length) {
    return 'Insertion'
  }
  if (ref.length > alt.length) {
    return 'Deletion'
  }
  return 'Variant'
}

const VariantId = styled.span`
  white-space: nowrap;
`

type MitochondrialVariantPageProps = {
  datasetId: string
  variant: MitochondrialVariantDetailPropType
}

const MitochondrialVariantPage = ({ datasetId, variant }: MitochondrialVariantPageProps) => (
  // @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
  <Page>
    <DocumentTitle title={variant.variant_id} />
    <GnomadPageHeading
      selectedDataset={datasetId}
      datasetOptions={{
        includeShortVariants: true,
        includeStructuralVariants: false,
        includeExac: false,
        includeGnomad2: false,
        includeGnomad3: true,
        includeGnomad3Subsets: false,
      }}
    >
      {/* @ts-expect-error TS(2786) FIXME: 'VariantType' cannot be used as a JSX component. */}
      <VariantType variantId={variant.variant_id} />:{' '}
      <VariantId>{variant.variant_id} (GRCh38)</VariantId>
    </GnomadPageHeading>
    <Wrapper>
      <ResponsiveSection>
        <MitochondrialVariantAttributeList variant={variant} />
        {variant.ac_hom_mnv > 0 && (
          <p>
            <Badge level="warning">Warning</Badge> In{' '}
            {variant.ac_hom_mnv === variant.ac_hom ? (
              'all'
            ) : (
              <>
                {variant.ac_hom_mnv} of {variant.ac_hom}
              </>
            )}{' '}
            individuals where this variant is homoplasmic or near-homoplasmic (heteroplasmy level ≥
            0.95), this variant occurs in phase with another variant, potentially altering the amino
            acid sequence.
          </p>
        )}
        {variant.flags && variant.flags.includes('common_low_heteroplasmy') && (
          <p>
            <Badge level="warning">Warning</Badge> Common low heteroplasmy: this variant is present
            at an overall frequency of .001 across all samples with a heteroplasmy level &gt; 0 and
            &lt; 0.50.
          </p>
        )}
      </ResponsiveSection>
      <ResponsiveSection>
        <h2>External Resources</h2>
        <MitochondrialVariantReferenceList variant={variant} />
        <h2>Feedback</h2>
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href={variantFeedbackUrl(variant, datasetId)}>
          Report an issue with this variant
        </ExternalLink>
      </ResponsiveSection>
    </Wrapper>
    <Section>
      <h2>Population Frequencies</h2>
      <MitochondrialVariantPopulationFrequenciesTable variant={variant} />
    </Section>
    <Section>
      <h2>
        Haplogroup Frequencies <InfoButton topic="mt-haplogroup-frequencies" />
      </h2>
      <TableWrapper>
        <MitochondrialVariantHaplogroupFrequenciesTable variant={variant} />
      </TableWrapper>
    </Section>
    <Wrapper>
      <ResponsiveSection>
        <h2>Heteroplasmy Distribution</h2>
        {/* @ts-expect-error TS(2741) FIXME: Property 'heteroplasmy_distribution' is missing in... Remove this comment to see the full error message */}
        <MitochondrialVariantHeteroplasmyDistribution variant={variant} />
      </ResponsiveSection>
      <ResponsiveSection>
        <h2>
          Age Distribution <InfoButton topic="age" />
        </h2>
        {/* @ts-expect-error TS(2559) FIXME: Type 'MitochondrialVariantDetailPropType' has no p... Remove this comment to see the full error message */}
        <MitochondrialVariantAgeDistribution variant={variant} />
      </ResponsiveSection>
    </Wrapper>
    <Wrapper>
      <ResponsiveSection>
        <h2>Annotations</h2>
        {/* @ts-expect-error TS(2741) FIXME: Property 'transcript_consequences' is missing in t... Remove this comment to see the full error message */}
        <MitochondrialVariantTranscriptConsequenceList variant={variant} />
      </ResponsiveSection>

      {(variant as any).clinvar && (
        <ResponsiveSection>
          <h2>ClinVar</h2>
          {/* @ts-expect-error TS(2741) FIXME: Property 'clinvar' is missing in type 'Mitochondri... Remove this comment to see the full error message */}
          <VariantClinvarInfo variant={variant} />
        </ResponsiveSection>
      )}
    </Wrapper>
    <Wrapper>
      <ResponsiveSection>
        <h2>Genotype Quality Metrics</h2>
        <MitochondrialVariantGenotypeQualityMetrics variant={variant} />
      </ResponsiveSection>
      <ResponsiveSection>
        <h2>Site Quality Metrics</h2>
        {/* @ts-expect-error TS(2322) FIXME: Type '{ datasetId: string; variant: MitochondrialV... Remove this comment to see the full error message */}
        <MitochondrialVariantSiteQualityMetrics datasetId={datasetId} variant={variant} />
      </ResponsiveSection>
    </Wrapper>
    <Section>
      <h2>Read Data</h2>
      <p>Read data is not yet available for mitochondrial variants.</p>
    </Section>
  </Page>
)

const variantQuery = `
query MitochondrialVariant($variantId: String!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
  meta {
    clinvar_release_date
  }
  clinvar_variant(variant_id: $variantId, reference_genome: $referenceGenome) {
    clinical_significance
    clinvar_variation_id
    gold_stars
    last_evaluated
    review_status
    submissions {
      clinical_significance
      conditions {
        name
        medgen_id
      }
      last_evaluated
      review_status
      submitter_name
    }
  }
  mitochondrial_variant(variant_id: $variantId, dataset: $datasetId) {
    ac_het
    ac_hom
    ac_hom_mnv
    age_distribution {
      het {
        bin_freq
        bin_edges
        n_smaller
        n_larger
      }
      hom {
        bin_freq
        bin_edges
        n_smaller
        n_larger
      }
    }
    alt
    an
    excluded_ac
    filters
    flags
    genotype_quality_metrics {
      name
      all {
        bin_freq
        bin_edges
        n_smaller
        n_larger
      }
      alt {
        bin_freq
        bin_edges
        n_smaller
        n_larger
      }
    }
    genotype_quality_filters {
      name
      filtered {
        bin_freq
        bin_edges
      }
    }
    haplogroup_defining
    haplogroups {
      id
      an
      ac_het
      ac_hom
      faf
      faf_hom
    }
    heteroplasmy_distribution {
      bin_freq
      bin_edges
      n_smaller
      n_larger
    }
    max_heteroplasmy
    mitotip_score
    mitotip_trna_prediction
    pon_ml_probability_of_pathogenicity
    pon_mt_trna_prediction
    populations {
      id
      ac_het
      ac_hom
      an
    }
    pos
    ref
    reference_genome
    rsids
    site_quality_metrics {
      name
      value
    }
    transcript_consequences {
      canonical
      gene_id
      gene_version
      gene_symbol
      hgvs
      hgvsc
      hgvsp
      lof
      lof_flags
      lof_filter
      major_consequence
      polyphen_prediction
      sift_prediction
      transcript_id
      transcript_version
    }
    variant_id
  }
}
`

type ConnectedMitochondrialVariantPageProps = {
  datasetId: string
  variantId: string
}

const ConnectedMitochondrialVariantPage = ({
  datasetId,
  variantId,
}: ConnectedMitochondrialVariantPageProps) => {
  if (datasetId === 'exac' || datasetId.startsWith('gnomad_r2')) {
    return (
      <StatusMessage>
        Mitochondrial variants are not available in {labelForDataset(datasetId)}
        <br />
        <br />
        <Link to={`/variant/${variantId}?dataset=gnomad_r3`} preserveSelectedDataset={false}>
          Search for this variant in gnomAD v3
        </Link>
      </StatusMessage>
    )
  }

  return (
    <Query
      query={variantQuery}
      variables={{ datasetId, variantId, referenceGenome: referenceGenomeForDataset(datasetId) }}
      loadingMessage="Loading variant"
      errorMessage="Unable to load variant"
      success={(data: any) => data.mitochondrial_variant}
    >
      {({ data }: any) => {
        const variant = { ...data.mitochondrial_variant, clinvar: data.clinvar_variant }
        if (variant.clinvar) {
          variant.clinvar.release_date = data.meta.clinvar_release_date
        }

        return <MitochondrialVariantPage datasetId={datasetId} variant={variant} />
      }}
    </Query>
  )
}

export default ConnectedMitochondrialVariantPage
