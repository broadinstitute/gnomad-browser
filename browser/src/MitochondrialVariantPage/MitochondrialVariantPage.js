import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { Badge, Page } from '@gnomad/ui'

import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import InfoButton from '../help/InfoButton'
import Histogram from '../Histogram'
import Link from '../Link'
import Query from '../Query'
import TableWrapper from '../TableWrapper'
import VariantFeedback from '../VariantPage/VariantFeedback'
import MitochondrialVariantAgeDistribution from './MitochondrialVariantAgeDistribution'
import MitochondrialVariantAttributeList from './MitochondrialVariantAttributeList'
import MitochondrialVariantDetailPropType from './MitochondrialVariantDetailPropType'
import MitochondrialVariantGenotypeQualityMetrics from './MitochondrialVariantGenotypeQualityMetrics'
import MitochondrialVariantHaplogroupFrequenciesTable from './MitochondrialVariantHaplogroupFrequenciesTable'
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

const VariantType = ({ variantId }) => {
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

const MitochondrialVariantPage = ({ datasetId, variant }) => (
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
        <h2>References</h2>
        <MitochondrialVariantReferenceList variant={variant} />
        <h2>Report</h2>
        <VariantFeedback datasetId={datasetId} variantId={variant.variant_id} />
      </ResponsiveSection>
    </Wrapper>
    <Section>
      <h2>Annotations</h2>
      <MitochondrialVariantTranscriptConsequenceList variant={variant} />
    </Section>
    <Wrapper>
      <ResponsiveSection>
        <h2>Heteroplasmy Distribution</h2>
        <Histogram
          barColor="#73ab3d"
          binEdges={variant.heteroplasmy_distribution.bin_edges}
          binValues={variant.heteroplasmy_distribution.bin_freq}
          xLabel="Heteroplasmy Level"
          yLabel="Individuals"
          formatTooltip={bin => `${bin.label}: ${bin.value.toLocaleString()} individuals`}
        />
      </ResponsiveSection>
      <ResponsiveSection>
        <h2>Age Distribution</h2>
        <MitochondrialVariantAgeDistribution variant={variant} />
        <p>
          <Link
            to={{
              pathname: '/faq',
              hash: '#what-is-the-age-distribution-in-gnomad',
            }}
          >
            See the FAQ for more information on age data.
          </Link>
        </p>
      </ResponsiveSection>
    </Wrapper>
    <Section>
      <h2>
        Haplogroup Frequencies <InfoButton topic="mt-haplogroup_frequencies" />
      </h2>
      <TableWrapper>
        <MitochondrialVariantHaplogroupFrequenciesTable variant={variant} />
      </TableWrapper>
    </Section>
    <Wrapper>
      <ResponsiveSection>
        <h2>Genotype Quality Metrics</h2>
        <MitochondrialVariantGenotypeQualityMetrics variant={variant} />
      </ResponsiveSection>
      <ResponsiveSection>
        <h2>Site Quality Metrics</h2>
        <MitochondrialVariantSiteQualityMetrics datasetId={datasetId} variant={variant} />
      </ResponsiveSection>
    </Wrapper>
    <Section>
      <h2>Read Data</h2>
      <p>Read data is not yet available for mitochondrial variants.</p>
    </Section>
  </Page>
)

MitochondrialVariantPage.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variant: MitochondrialVariantDetailPropType.isRequired,
}

const variantQuery = `
query MitochondrialVariant($variantId: String!, $datasetId: DatasetId!) {
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
    pos
    ref
    reference_genome
    rsid
    site_quality_metrics {
      name
      value
    }
    sortedTranscriptConsequences: transcript_consequences {
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

const ConnectedMitochondrialVariantPage = ({ datasetId, variantId, ...rest }) => {
  return (
    <Query
      query={variantQuery}
      variables={{ datasetId, variantId }}
      loadingMessage="Loading variant"
      errorMessage="Unable to load variant"
      success={data => data.mitochondrial_variant}
    >
      {({ data }) => {
        return (
          <MitochondrialVariantPage
            {...rest}
            datasetId={datasetId}
            variant={data.mitochondrial_variant}
          />
        )
      }}
    </Query>
  )
}

ConnectedMitochondrialVariantPage.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variantId: PropTypes.string.isRequired,
}

export default ConnectedMitochondrialVariantPage
