import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { Badge, Page } from '@gnomad/ui'

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
import ExacVariantOccurrenceTable from './ExacVariantOccurrenceTable'
import { ReferenceList } from './ReferenceList'
import GnomadAgeDistribution from './GnomadAgeDistribution'
import LoFCurationResult from './LoFCurationResult'
import VariantFeedback from './VariantFeedback'
import VariantGenotypeQualityMetrics from './VariantGenotypeQualityMetrics'
import VariantNotFound from './VariantNotFound'
import { GnomadVariantOccurrenceTable } from './VariantOccurrenceTable'
import VariantInSilicoPredictors from './VariantInSilicoPredictors'
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

const ScrollWrapper = styled.div`
  overflow-x: auto;
`

const VariantPageContent = ({ datasetId, variant }) => (
  <VariantDetailsContainer>
    <ResponsiveSection>
      <ScrollWrapper>
        {datasetId === 'exac' ? (
          <ExacVariantOccurrenceTable variant={variant} />
        ) : (
          <GnomadVariantOccurrenceTable
            datasetId={datasetId}
            variant={variant}
            showExomes={!datasetId.startsWith('gnomad_r3')}
          />
        )}
      </ScrollWrapper>

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

      {variant.colocatedVariants && variant.colocatedVariants.length > 0 && (
        <div>
          <p>
            <strong>This variant is multiallelic. Other alt alleles are:</strong>
          </p>
          <ul>
            {variant.colocatedVariants.map(colocatedVariantId => (
              <li key={colocatedVariantId}>
                <Link to={`/variant/${colocatedVariantId}`}>{colocatedVariantId}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(variant.multiNucleotideVariants || []).length > 0 && (
        <div>
          <p>
            <strong>This variant&apos;s consequence may be affected by other variants:</strong>
          </p>
          <MNVSummaryList multiNucleotideVariants={variant.multiNucleotideVariants} />
        </div>
      )}
    </ResponsiveSection>
    <ResponsiveSection>
      <h2>References</h2>
      <ReferenceList variant={variant} />
      <h2>Report</h2>
      <VariantFeedback datasetId={datasetId} variantId={variant.variantId} />
    </ResponsiveSection>
    <Section>
      <h2>Variant Effect Predictor</h2>
      <VariantTranscriptConsequences variant={variant} />
    </Section>

    {variant.lof_curations && (
      <Section>
        <h2>
          LoF Curation <InfoButton topic="lof_curation" />
        </h2>
        <div>
          This variant was manually curated in{' '}
          {new Set(variant.lof_curations.map(c => c.gene_id)).size} genes.
          <ul>
            {variant.lof_curations.map(result => (
              <li key={result.gene_id}>
                <LoFCurationResult result={result} />
              </li>
            ))}
          </ul>
        </div>
      </Section>
    )}

    {variant.in_silico_predictors && variant.in_silico_predictors.length && (
      <Section>
        <h2>In Silico Predictors</h2>
        <VariantInSilicoPredictors variant={variant} />
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
          <h2>Age Distribution</h2>
          {datasetId.startsWith('gnomad_r3') && datasetId !== 'gnomad_r3' && (
            <p>Age distribution is based on the full gnomAD dataset, not the selected subset.</p>
          )}
          <GnomadAgeDistribution datasetId={datasetId} variant={variant} />
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
      <ReadData datasetId={datasetId} variantIds={[variant.variantId]} />
    </Section>
  </VariantDetailsContainer>
)

VariantPageContent.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variant: PropTypes.shape({
    variantId: PropTypes.string.isRequired,
    chrom: PropTypes.string.isRequired,
    flags: PropTypes.arrayOf(PropTypes.string).isRequired,
    colocatedVariants: PropTypes.arrayOf(PropTypes.string),
    multiNucleotideVariants: PropTypes.arrayOf(PropTypes.object),
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

const VariantPageTitle = ({ datasetId, rsId, variantId }) => {
  let id

  if (variantId) {
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

    id = (
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
      </>
    )
  } else {
    id = <span>{rsId}</span>
  }

  return (
    <>
      {id}
      <Separator> </Separator>
      <span>({referenceGenomeForDataset(datasetId)})</span>
    </>
  )
}

VariantPageTitle.propTypes = {
  datasetId: PropTypes.string.isRequired,
  rsId: PropTypes.string,
  variantId: PropTypes.string,
}

VariantPageTitle.defaultProps = {
  rsId: undefined,
  variantId: undefined,
}

const variantQuery = `
query GnomadVariant($variantId: String, $rsid: String, $datasetId: DatasetId!) {
  variant(variantId: $variantId, rsid: $rsid, dataset: $datasetId) {
    variantId
    reference_genome
    chrom
    pos
    ref
    alt
    colocatedVariants
    multiNucleotideVariants {
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
      qualityMetrics {
        alleleBalance {
          alt {
            bin_edges
            bin_freq
            n_smaller
            n_larger
          }
        }
        genotypeDepth {
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
        genotypeQuality {
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
        siteQualityMetrics {
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
      qualityMetrics {
        alleleBalance {
          alt {
            bin_edges
            bin_freq
            n_smaller
            n_larger
          }
        }
        genotypeDepth {
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
        genotypeQuality {
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
        siteQualityMetrics {
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
    rsid
    sortedTranscriptConsequences {
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
    }
  }
}
`

const VariantPage = ({ datasetId, rsId, variantId: variantIdProp }) => {
  const queryVariables = { datasetId }
  if (variantIdProp) {
    queryVariables.variantId = variantIdProp
  } else {
    queryVariables.rsid = rsId
  }

  return (
    <Page>
      <DocumentTitle title={`${variantIdProp || rsId} | ${labelForDataset(datasetId)}`} />
      <BaseQuery key={datasetId} query={variantQuery} variables={queryVariables}>
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
              if (variantIdProp) {
                pageContent = <VariantNotFound datasetId={datasetId} variantId={variantIdProp} />
              } else {
                pageContent = <StatusMessage>Variant not found</StatusMessage>
              }
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
            pageContent = <VariantPageContent datasetId={datasetId} variant={data.variant} />
          }

          const variantId = ((data || {}).variant || {}).variantId || variantIdProp
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
                <VariantPageTitle variantId={variantId} rsId={rsId} datasetId={datasetId} />
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
  rsId: PropTypes.string,
  variantId: PropTypes.string,
}

VariantPage.defaultProps = {
  rsId: undefined,
  variantId: undefined,
}

export default VariantPage
