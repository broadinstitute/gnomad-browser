import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { Badge, ExternalLink, Page } from '@gnomad/ui'

import { labelForDataset, referenceGenomeForDataset } from '../datasets'
import Delayed from '../Delayed'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import InfoButton from '../help/InfoButton'
import Link from '../Link'
import MNVSummaryList from '../MNVPage/MNVSummaryList'
import { BaseQuery } from '../Query'
import ReadData from '../ReadData/ReadData'
import StatusMessage from '../StatusMessage'
import TableWrapper from '../TableWrapper'
import ExacVariantOccurrenceTable from './ExacVariantOccurrenceTable'
import { ReferenceList } from './ReferenceList'
import GnomadAgeDistribution from './GnomadAgeDistribution'
import VariantClinvarInfo from './VariantClinvarInfo'
import VariantGenotypeQualityMetrics from './VariantGenotypeQualityMetrics'
import VariantNotFound from './VariantNotFound'
import { GnomadVariantOccurrenceTable } from './VariantOccurrenceTable'
import VariantInSilicoPredictors from './VariantInSilicoPredictors'
import VariantLoFCurationResults from './VariantLoFCurationResults'
import VariantPopulationFrequencies from './VariantPopulationFrequencies'
import VariantSiteQualityMetrics from './VariantSiteQualityMetrics'
import VariantTranscriptConsequences from './VariantTranscriptConsequences'

const Section = styled.section`
  width: 100%;
`

const ResponsiveSection = styled(Section)`
  width: calc(50% - 15px);

  @media (max-width: 992px) {
    width: 100%;
  }
`

const VariantDetailsContainer = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
`

const VariantPageContent = ({ datasetId, variant }) => {
  return (
    <VariantDetailsContainer>
      <ResponsiveSection>
        <TableWrapper>
          {datasetId === 'exac' ? (
            <ExacVariantOccurrenceTable variant={variant} />
          ) : (
            <GnomadVariantOccurrenceTable
              datasetId={datasetId}
              variant={variant}
              showExomes={!datasetId.startsWith('gnomad_r3')}
            />
          )}
        </TableWrapper>

        {variant.flags && variant.flags.includes('par') && (
          <p>
            <Badge level="info">Note</Badge> This variant is found in a pseudoautosomal region.
          </p>
        )}

        {variant.flags && variant.flags.includes('lcr') && (
          <p>
            <Badge level="info">Note</Badge> This variant is found in a low complexity region.
          </p>
        )}
      </ResponsiveSection>
      <ResponsiveSection>
        <h2>External Resources</h2>
        <ReferenceList variant={variant} />
        <h2>Feedback</h2>
        <ExternalLink href={process.env.REPORT_VARIANT_URL || 'mailto:gnomad@broadinstitute.org'}>
          Report an issue with this variant
        </ExternalLink>
      </ResponsiveSection>

      {((variant.colocated_variants || []).length > 0 ||
        (variant.multi_nucleotide_variants || []).length > 0) && (
        <Section>
          <h2>Related Variants</h2>
          {variant.colocated_variants && variant.colocated_variants.length > 0 && (
            <div>
              <h3>Other Alternate Alleles</h3>
              <p>This variant is multiallelic. Other alternate alleles are:</p>
              <ul>
                {variant.colocated_variants.map(colocatedVariantId => (
                  <li key={colocatedVariantId}>
                    <Link to={`/variant/${colocatedVariantId}`}>{colocatedVariantId}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(variant.multi_nucleotide_variants || []).length > 0 && (
            <div>
              <h3>Multi-nucleotide Variants</h3>
              <p>This variant&apos;s consequence may be affected by other variants:</p>
              <MNVSummaryList multiNucleotideVariants={variant.multi_nucleotide_variants} />
            </div>
          )}
        </Section>
      )}

      <Section>
        <h2>Variant Effect Predictor</h2>
        <VariantTranscriptConsequences variant={variant} />
      </Section>

      {variant.lof_curations && (
        <Section>
          <h2>
            LoF Curation <InfoButton topic="lof-curation" />
          </h2>
          <VariantLoFCurationResults variant={variant} />
        </Section>
      )}

      {variant.in_silico_predictors && variant.in_silico_predictors.length && (
        <Section>
          <h2>In Silico Predictors</h2>
          <VariantInSilicoPredictors variant={variant} />
        </Section>
      )}

      {variant.clinvar && (
        <Section>
          <h2>ClinVar</h2>
          <VariantClinvarInfo variant={variant} />
        </Section>
      )}

      <ResponsiveSection>
        <h2>
          Population Frequencies <InfoButton topic="ancestry" />
        </h2>
        <VariantPopulationFrequencies datasetId={datasetId} variant={variant} />
      </ResponsiveSection>
      <ResponsiveSection>
        {((variant.exome || {}).age_distribution || (variant.genome || {}).age_distribution) && (
          <React.Fragment>
            <h2>
              Age Distribution <InfoButton topic="age" />
            </h2>
            {datasetId.startsWith('gnomad_r3') && datasetId !== 'gnomad_r3' && (
              <p>Age distribution is based on the full gnomAD dataset, not the selected subset.</p>
            )}
            <GnomadAgeDistribution datasetId={datasetId} variant={variant} />
          </React.Fragment>
        )}
      </ResponsiveSection>
      <ResponsiveSection>
        <h2>Genotype Quality Metrics</h2>
        <VariantGenotypeQualityMetrics datasetId={datasetId} variant={variant} />
      </ResponsiveSection>
      <ResponsiveSection>
        <h2>Site Quality Metrics</h2>
        <VariantSiteQualityMetrics datasetId={datasetId} variant={variant} />
      </ResponsiveSection>
      <Section>
        <h2>Read Data</h2>
        <ReadData datasetId={datasetId} variantIds={[variant.variant_id]} />
      </Section>
    </VariantDetailsContainer>
  )
}

VariantPageContent.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variant: PropTypes.shape({
    variant_id: PropTypes.string.isRequired,
    chrom: PropTypes.string.isRequired,
    flags: PropTypes.arrayOf(PropTypes.string).isRequired,
    clinvar: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    colocated_variants: PropTypes.arrayOf(PropTypes.string),
    multi_nucleotide_variants: PropTypes.arrayOf(PropTypes.object),
    exome: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    genome: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    lof_curations: PropTypes.arrayOf(PropTypes.object), // eslint-disable-line react/forbid-prop-types
    in_silico_predictors: PropTypes.arrayOf(PropTypes.object), // eslint-disable-line react/forbid-prop-types
  }).isRequired,
}

const VariantPageTitleAlleles = styled.span`
  display: inline-flex;
  max-width: 320px;
  white-space: nowrap;

  @media (max-width: 900px) {
    justify-content: center;
    max-width: 100%;
  }
`

const Separator = styled.span`
  @media (max-width: 900px) {
    display: none;
  }
`

const VariantPageTitle = ({ datasetId, variantId }) => {
  const [chrom, pos, ref, alt] = variantId.split('-')

  let variantDescription = 'Variant'
  if (ref.length === 1 && alt.length === 1) {
    variantDescription = 'Single nucleotide variant'
  }
  if (ref.length < alt.length) {
    const insertionLength = alt.length - ref.length
    variantDescription = `Insertion (${insertionLength} base${insertionLength > 1 ? 's' : ''})`
  }
  if (ref.length > alt.length) {
    const deletionLength = ref.length - alt.length
    variantDescription = `Deletion (${deletionLength} base${deletionLength > 1 ? 's' : ''})`
  }

  return (
    <>
      <span>{variantDescription}</span>
      <Separator>: </Separator>
      <span>
        {chrom}-{pos}
      </span>
      <Separator>-</Separator>
      <VariantPageTitleAlleles>
        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>
          {ref}-{alt}
        </span>
      </VariantPageTitleAlleles>
      <Separator> </Separator>
      <span>({referenceGenomeForDataset(datasetId)})</span>
    </>
  )
}

VariantPageTitle.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variantId: PropTypes.string.isRequired,
}

const variantQuery = `
query GnomadVariant($variantId: String!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
  variant(variantId: $variantId, dataset: $datasetId) {
    variant_id
    reference_genome
    chrom
    pos
    ref
    alt
    colocated_variants
    multi_nucleotide_variants {
      combined_variant_id
      changes_amino_acids
      n_individuals
      other_constituent_snvs
    }
    exome {
      ac
      an
      ac_hemi
      ac_hom
      faf95 {
        popmax
        popmax_population
      }
      filters
      populations {
        id
        ac
        an
        ac_hemi
        ac_hom
      }
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
      quality_metrics {
        allele_balance {
          alt {
            bin_edges
            bin_freq
            n_smaller
            n_larger
          }
        }
        genotype_depth {
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
        site_quality_metrics {
          metric
          value
        }
      }
    }
    genome {
      ac
      an
      ac_hemi
      ac_hom
      faf95 {
        popmax
        popmax_population
      }
      filters
      populations {
        id
        ac
        an
        ac_hemi
        ac_hom
      }
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
      quality_metrics {
        allele_balance {
          alt {
            bin_edges
            bin_freq
            n_smaller
            n_larger
          }
        }
        genotype_depth {
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
        site_quality_metrics {
          metric
          value
        }
      }
    }
    flags
    lof_curations {
      gene_id
      gene_symbol
      verdict
      flags
    }
    rsids
    transcript_consequences {
      gene_id
      gene_version
      gene_symbol
      hgvs
      hgvsc
      hgvsp
      is_canonical
      is_mane_select
      is_mane_select_version
      lof
      lof_flags
      lof_filter
      major_consequence
      polyphen_prediction
      sift_prediction
      transcript_id
      transcript_version
    }
    in_silico_predictors {
      id
      value
      flags
    }
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

  meta {
    clinvar_release_date
  }
}
`

const VariantPage = ({ datasetId, variantId }) => {
  return (
    <Page>
      <DocumentTitle title={`${variantId} | ${labelForDataset(datasetId)}`} />
      <BaseQuery
        key={datasetId}
        query={variantQuery}
        variables={{ datasetId, referenceGenome: referenceGenomeForDataset(datasetId), variantId }}
      >
        {({ data, error, graphQLErrors, loading }) => {
          let pageContent = null
          if (loading) {
            pageContent = (
              <Delayed>
                <StatusMessage>Loading variant...</StatusMessage>
              </Delayed>
            )
          } else if (error) {
            pageContent = <StatusMessage>Unable to load variant</StatusMessage>
          } else if (!(data || {}).variant) {
            if (graphQLErrors && graphQLErrors.some(err => err.message === 'Variant not found')) {
              pageContent = <VariantNotFound datasetId={datasetId} variantId={variantId} />
            } else {
              pageContent = (
                <StatusMessage>
                  {graphQLErrors && graphQLErrors.length
                    ? Array.from(new Set(graphQLErrors.map(e => e.message))).join(', ')
                    : 'Unable to load variant'}
                </StatusMessage>
              )
            }
          } else {
            const variant = {
              ...data.variant,
              clinvar: data.clinvar_variant
                ? { ...data.clinvar_variant, release_date: data.meta.clinvar_release_date }
                : null,
            }
            pageContent = <VariantPageContent datasetId={datasetId} variant={variant} />
          }

          return (
            <React.Fragment>
              <GnomadPageHeading
                datasetOptions={{
                  // Include ExAC for GRCh37 datasets
                  includeExac: !datasetId.startsWith('gnomad_r3'),
                  // Include gnomAD versions based on the same reference genome as the current dataset
                  includeGnomad2: !datasetId.startsWith('gnomad_r3'),
                  includeGnomad3: datasetId.startsWith('gnomad_r3'),
                  // Variant ID not valid for SVs
                  includeStructuralVariants: false,
                }}
                selectedDataset={datasetId}
              >
                <VariantPageTitle variantId={variantId} datasetId={datasetId} />
              </GnomadPageHeading>
              {pageContent}
            </React.Fragment>
          )
        }}
      </BaseQuery>
    </Page>
  )
}

VariantPage.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variantId: PropTypes.string.isRequired,
}

export default VariantPage
