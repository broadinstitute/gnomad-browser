import React from 'react'
import styled from 'styled-components'

import { Badge, ExternalLink, Page } from '@gnomad/ui'

import {
  DatasetId,
  labelForDataset,
  referenceGenome,
  hasMitochondrialVariants,
} from '@gnomad/dataset-metadata/metadata'

import { PopulationId } from '@gnomad/dataset-metadata/gnomadPopulations'

import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import InfoButton from '../help/InfoButton'
import Link from '../Link'
import Query from '../Query'
import StatusMessage from '../StatusMessage'
import TableWrapper from '../TableWrapper'
import { variantFeedbackUrl } from '../variantFeedback'
import { ClinvarVariant, Histogram, TranscriptConsequence } from '../VariantPage/VariantPage'
import VariantClinvarInfo from '../VariantPage/VariantClinvarInfo'
import MitochondrialVariantAgeDistribution from './MitochondrialVariantAgeDistribution'
import MitochondrialVariantAttributeList from './MitochondrialVariantAttributeList'
import MitochondrialVariantGenotypeQualityMetrics from './MitochondrialVariantGenotypeQualityMetrics'
import MitochondrialVariantHaplogroupFrequenciesTable from './MitochondrialVariantHaplogroupFrequenciesTable'
import MitochondrialVariantHeteroplasmyDistribution from './MitochondrialVariantHeteroplasmyDistribution'
import MitochondrialVariantPopulationFrequenciesTable from './MitochondrialVariantPopulationFrequenciesTable'
import MitochondrialVariantReferenceList from './MitochondrialVariantReferenceList'
import MitochondrialVariantSiteQualityMetrics from './MitochondrialVariantSiteQualityMetrics'
import {
  MitotipTrnaPrediction,
  PonMtTrnaPrediction,
} from './MitochondrialVariantTranscriptConsequence'
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

const variantType = (variantId: string) => {
  const [_chrom, _pos, ref, alt] = variantId.split('-')
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

export type GenotypeQualityFilter = {
  name: string
  filtered: Histogram | null
}

export type MitochondrialVariantPopulation = {
  id: PopulationId
  an: number
  ac_het: number
  ac_hom: number
}

export type MitochondrialVariant = {
  alt: string
  an: number
  ac_hom: number
  ac_hom_mnv: number
  age_distribution: { het: Histogram; hom: Histogram }
  ac_het: number
  excluded_ac: number | null
  flags: string[] | null
  haplogroup_defining: boolean | null
  haplogroups: {
    id: string
    an: number
    ac_hom: number
    ac_het: number
  }[]
  max_heteroplasmy: number | null
  populations: MitochondrialVariantPopulation[]
  pos: number
  ref: string
  reference_genome: string
  variant_id: string
  rsids: string[] | null
  clinvar: ClinvarVariant | null
  site_quality_metrics: {
    name: string
    value: number | null
  }[]
  genotype_quality_filters: GenotypeQualityFilter[]
  genotype_quality_metrics: {
    name: string
    all: Histogram | null
    alt: Histogram | null
  }[]
  transcript_consequences: TranscriptConsequence[]
  heteroplasmy_distribution: Histogram
  filters: string[] | null
  mitotip_trna_prediction: MitotipTrnaPrediction | null
  pon_mt_trna_prediction: PonMtTrnaPrediction | null
  mitotip_score: number | null
  pon_ml_probability_of_pathogenicity: number | null
}

type MitochondrialVariantPageProps = {
  datasetId: DatasetId
  variant: MitochondrialVariant
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
      {variantType(variant.variant_id)}: <VariantId>{variant.variant_id} (GRCh38)</VariantId>
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
        <ExternalLink href={variantFeedbackUrl(variant, datasetId)}>
          Report an issue with this variant
        </ExternalLink>
      </ResponsiveSection>
    </Wrapper>
    <Section>
      <h2>Genetic Ancestry Group Frequencies</h2>
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
        <MitochondrialVariantHeteroplasmyDistribution variant={variant} />
      </ResponsiveSection>
      <ResponsiveSection>
        <h2>
          Age Distribution <InfoButton topic="age" />
        </h2>
        <MitochondrialVariantAgeDistribution variant={variant} />
      </ResponsiveSection>
    </Wrapper>
    <Wrapper>
      <ResponsiveSection>
        <h2>Annotations</h2>
        <MitochondrialVariantTranscriptConsequenceList variant={variant} />
      </ResponsiveSection>

      {variant.clinvar && (
        <ResponsiveSection>
          <h2>ClinVar</h2>
          <VariantClinvarInfo clinvar={variant.clinvar} />
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
        <MitochondrialVariantSiteQualityMetrics variant={variant} />
      </ResponsiveSection>
    </Wrapper>
    <Section>
      <h2>Read Data</h2>
      <p>Read data is not yet available for mitochondrial variants.</p>
    </Section>
  </Page>
)

const operationName = 'MitochondrialVariant'
const variantQuery = `
query ${operationName}($variantId: String!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
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
  datasetId: DatasetId
  variantId: string
}

const ConnectedMitochondrialVariantPage = ({
  datasetId,
  variantId,
}: ConnectedMitochondrialVariantPageProps) => {
  if (!hasMitochondrialVariants(datasetId)) {
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
      operationName={operationName}
      query={variantQuery}
      variables={{ datasetId, variantId, referenceGenome: referenceGenome(datasetId) }}
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
