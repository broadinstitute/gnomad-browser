import React from 'react'
import styled from 'styled-components'

import { Badge, Button, ExternalLink, Page } from '@gnomad/ui'

import { labelForDataset, referenceGenomeForDataset } from '../datasets'
import Delayed from '../Delayed'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import InfoButton from '../help/InfoButton'
import { BaseQuery } from '../Query'
import ReadData from '../ReadData/ReadData'
import StatusMessage from '../StatusMessage'
import TableWrapper from '../TableWrapper'
import { variantFeedbackUrl } from '../variantFeedback'
import ExacVariantOccurrenceTable from './ExacVariantOccurrenceTable'
import { ReferenceList } from './ReferenceList'
import GnomadAgeDistribution from './GnomadAgeDistribution'
import VariantClinvarInfo from './VariantClinvarInfo'
import VariantGenotypeQualityMetrics from './VariantGenotypeQualityMetrics'
import VariantNotFound from './VariantNotFound'
import { GnomadVariantOccurrenceTable } from './VariantOccurrenceTable'
import VariantInSilicoPredictors from './VariantInSilicoPredictors'
import VariantLoFCurationResults from './VariantLoFCurationResults'
import VariantPageTitle from './VariantPageTitle'
import VariantPopulationFrequencies from './VariantPopulationFrequencies'
import VariantRelatedVariants from './VariantRelatedVariants'
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

const FlexWrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  width: 100%;
`

type VariantPageContentProps = {
  datasetId: string
  variant: {
    variant_id: string
    chrom: string
    flags: string[]
    clinvar?: any
    exome?: any
    genome?: any
    lof_curations?: any[]
    in_silico_predictors?: any[]
    transcript_consequences?: any[]
  }
}

const VariantPageContent = ({ datasetId, variant }: VariantPageContentProps) => {
  return (
    <FlexWrapper>
      <ResponsiveSection>
        <TableWrapper>
          {datasetId === 'exac' ? (
            // @ts-expect-error TS(2741) FIXME: Property 'coverage' is missing in type '{ variant_... Remove this comment to see the full error message
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
        {/* @ts-expect-error TS(2739) FIXME: Type '{ variant_id: string; chrom: string; flags: ... Remove this comment to see the full error message */}
        <ReferenceList variant={variant} />
        <h2>Feedback</h2>
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href={variantFeedbackUrl(variant, datasetId)}>
          Report an issue with this variant
        </ExternalLink>
      </ResponsiveSection>

      <Section>
        <h2>
          Population Frequencies <InfoButton topic="ancestry" />
        </h2>
        {datasetId.startsWith('gnomad_r3') &&
          (variant.genome.local_ancestry_populations || []).length > 0 && (
            <div
              style={{
                padding: '0 1em',
                border: '2px solid #1173bb',
                background: '#1173bb0f',
                borderRadius: '0.5em',
                marginBottom: '1em',
              }}
            >
              <p>
                <Badge level="info">NEW</Badge> Local ancestry is now available for gnomAD v3.
                Select the &ldquo;Local Ancestry&rdquo; tab below to view data. See our blog post on{' '}
                {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
                <ExternalLink href="https://gnomad.broadinstitute.org/news/2021-12-local-ancestry-inference-for-latino-admixed-american-samples-in-gnomad/">
                  local ancestry inference for Latino/Admixed American samples in gnomAD
                </ExternalLink>{' '}
                for more information.
              </p>
            </div>
          )}
        <VariantPopulationFrequencies datasetId={datasetId} variant={variant} />
      </Section>

      <Section>
        <h2>Related Variants</h2>
        <VariantRelatedVariants datasetId={datasetId} variant={variant} />
      </Section>

      <Section>
        <h2>Variant Effect Predictor</h2>
        {/* @ts-expect-error TS(2741) FIXME: Property 'reference_genome' is missing in type '{ ... Remove this comment to see the full error message */}
        <VariantTranscriptConsequences variant={variant} />
      </Section>

      {variant.lof_curations && (
        <Section>
          <h2>
            LoF Curation <InfoButton topic="lof-curation" />
          </h2>
          {/* @ts-expect-error TS(2322) FIXME: Type '{ variant_id: string; chrom: string; flags: ... Remove this comment to see the full error message */}
          <VariantLoFCurationResults variant={variant} />
        </Section>
      )}

      {variant.in_silico_predictors && variant.in_silico_predictors.length && (
        <Section>
          <h2>In Silico Predictors</h2>
          {/* @ts-expect-error TS(2322) FIXME: Type '{ variant_id: string; chrom: string; flags: ... Remove this comment to see the full error message */}
          <VariantInSilicoPredictors variant={variant} />
        </Section>
      )}

      {variant.clinvar && (
        <Section>
          <h2>ClinVar</h2>
          {/* @ts-expect-error TS(2322) FIXME: Type '{ variant_id: string; chrom: string; flags: ... Remove this comment to see the full error message */}
          <VariantClinvarInfo variant={variant} />
        </Section>
      )}

      <FlexWrapper>
        <ResponsiveSection>
          {((variant.exome || {}).age_distribution || (variant.genome || {}).age_distribution) && (
            <React.Fragment>
              <h2>
                Age Distribution <InfoButton topic="age" />
              </h2>
              {datasetId.startsWith('gnomad_r3') && datasetId !== 'gnomad_r3' && (
                <p>
                  Age distribution is based on the full gnomAD dataset, not the selected subset.
                </p>
              )}
              <GnomadAgeDistribution datasetId={datasetId} variant={variant} />
            </React.Fragment>
          )}
        </ResponsiveSection>
      </FlexWrapper>

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
    </FlexWrapper>
  )
}

const variantQuery = `
query GnomadVariant($variantId: String!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!, $includeLocalAncestry: Boolean!, $includeLiftoverAsSource: Boolean!, $includeLiftoverAsTarget: Boolean!) {
  variant(variantId: $variantId, dataset: $datasetId) {
    variant_id
    reference_genome
    chrom
    pos
    ref
    alt
    caid
    colocated_variants
    coverage {
      exome {
        mean
      }
      genome {
        mean
      }
    }
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
      local_ancestry_populations @include(if: $includeLocalAncestry) {
        id
        ac
        an
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
      local_ancestry_populations @include(if: $includeLocalAncestry) {
        id
        ac
        an
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
      project
    }
    rsids
    transcript_consequences {
      domains
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

  liftover(source_variant_id: $variantId, reference_genome: $referenceGenome) @include(if: $includeLiftoverAsSource) {
    liftover {
      variant_id
      reference_genome
    }
    datasets
  }

  liftover_sources: liftover(liftover_variant_id: $variantId, reference_genome: $referenceGenome) @include(if: $includeLiftoverAsTarget) {
    source {
      variant_id
      reference_genome
    }
    datasets
  }

  meta {
    clinvar_release_date
  }
}
`

type VariantPageProps = {
  datasetId: string
  variantId: string
}

const VariantPage = ({ datasetId, variantId }: VariantPageProps) => {
  return (
    // @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
    <Page>
      <DocumentTitle title={`${variantId} | ${labelForDataset(datasetId)}`} />
      {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
      <BaseQuery
        key={datasetId}
        query={variantQuery}
        variables={{
          datasetId,
          includeLocalAncestry: datasetId === 'gnomad_r3',
          includeLiftoverAsSource: datasetId.startsWith('gnomad_r2_1'),
          includeLiftoverAsTarget: datasetId.startsWith('gnomad_r3'),
          referenceGenome: referenceGenomeForDataset(datasetId),
          variantId,
        }}
      >
        {({ data, error, graphQLErrors, loading }: any) => {
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
            if (
              graphQLErrors &&
              graphQLErrors.some((err: any) => err.message === 'Variant not found')
            ) {
              // @ts-expect-error TS(2322) FIXME: Type '{ datasetId: string; variantId: string; }' i... Remove this comment to see the full error message
              pageContent = <VariantNotFound datasetId={datasetId} variantId={variantId} />
            } else {
              pageContent = (
                <StatusMessage>
                  {graphQLErrors && graphQLErrors.length
                    ? Array.from(
                        new Set(
                          graphQLErrors
                            .filter((e: any) => !e.message.includes('ClinVar'))
                            .map((e: any) => e.message)
                        )
                      ).join(', ')
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
              liftover: data.liftover,
              liftover_sources: data.liftover_sources,
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
                extra={
                  navigator.clipboard &&
                  navigator.clipboard.writeText && (
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(variantId)
                      }}
                      style={{ margin: '0 1em' }}
                    >
                      Copy variant ID
                    </Button>
                  )
                }
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

export default VariantPage
