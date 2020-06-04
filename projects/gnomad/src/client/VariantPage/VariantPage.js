import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { QuestionMark } from '@gnomad/help'
import { Badge, Page } from '@gnomad/ui'

import { referenceGenomeForDataset } from '../datasets'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import Link from '../Link'
import Query from '../Query'
import StatusMessage from '../StatusMessage'
import ExacVariantOccurrenceTable from './ExacVariantOccurrenceTable'
import { ReferenceList } from './ReferenceList'
import GnomadAgeDistribution from './GnomadAgeDistribution'
import { GnomadPopulationsTable } from './GnomadPopulationsTable'
import MNVSummaryList from './MultiNucleotideVariant/MNVSummaryList'
import { GnomadGenotypeQualityMetrics } from './qualityMetrics/GnomadGenotypeQualityMetrics'
import { GnomadSiteQualityMetrics } from './qualityMetrics/GnomadSiteQualityMetrics'
import variantQuery from './queries/gnomadVariantQuery'
import GnomadReadData from './reads/GnomadReadData'
import VariantFeedback from './VariantFeedback'
import VariantNotFound from './VariantNotFound'
import { GnomadVariantOccurrenceTable } from './VariantOccurrenceTable'
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

      {variant.colocatedVariants.length > 0 && (
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
      <h2>Annotations</h2>
      <VariantTranscriptConsequences variant={variant} />
    </Section>
    <ResponsiveSection>
      <h2>
        Population Frequencies <QuestionMark topic="ancestry" />
      </h2>
      <ScrollWrapper>
        <GnomadPopulationsTable
          exomePopulations={variant.exome ? variant.exome.populations : []}
          genomePopulations={variant.genome ? variant.genome.populations : []}
          showHemizygotes={variant.chrom === 'X' || variant.chrom === 'Y'}
        />
      </ScrollWrapper>
    </ResponsiveSection>
    <ResponsiveSection>
      {((variant.exome || {}).age_distribution || (variant.genome || {}).age_distribution) && (
        <React.Fragment>
          <h2>Age Distribution</h2>
          {datasetId.startsWith('gnomad_r2') && datasetId !== 'gnomad_r2_1' && (
            <p>Age distribution is based on the full gnomAD dataset, not the selected subset.</p>
          )}
          <GnomadAgeDistribution datasetId={datasetId} variant={variant} />
        </React.Fragment>
      )}
    </ResponsiveSection>
    <ResponsiveSection>
      <h2>Genotype Quality Metrics</h2>
      <GnomadGenotypeQualityMetrics datasetId={datasetId} variant={variant} />
    </ResponsiveSection>
    <ResponsiveSection>
      <h2>Site Quality Metrics</h2>
      <GnomadSiteQualityMetrics datasetId={datasetId} variant={variant} />
    </ResponsiveSection>
    <Section>
      <h2>Read Data</h2>
      {datasetId.startsWith('gnomad_r3') ? (
        <p>Read data is not yet available for gnomAD v3.</p>
      ) : (
        <GnomadReadData datasetId={datasetId} variantIds={[variant.variantId]} />
      )}
    </Section>
  </VariantDetailsContainer>
)

VariantPageContent.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variant: PropTypes.shape({
    variantId: PropTypes.string.isRequired,
    chrom: PropTypes.string.isRequired,
    flags: PropTypes.arrayOf(PropTypes.string).isRequired,
    colocatedVariants: PropTypes.arrayOf(PropTypes.string).isRequired,
    multiNucleotideVariants: PropTypes.arrayOf(PropTypes.object),
    exome: PropTypes.object.isRequired,
    genome: PropTypes.object.isRequired,
  }).isRequired,
}

const VariantPage = ({ datasetId, rsId, variantId: variantIdProp }) => {
  const queryVariables = { datasetId }
  if (variantIdProp) {
    queryVariables.variantId = variantIdProp
  } else {
    queryVariables.rsid = rsId
  }

  return (
    <Page>
      <DocumentTitle title={variantIdProp || rsId} />
      <Query key={datasetId} query={variantQuery} variables={queryVariables}>
        {({ data, error, graphQLErrors, loading }) => {
          let pageContent = null
          if (loading) {
            pageContent = <StatusMessage>Loading variant...</StatusMessage>
          } else if (error) {
            pageContent = <StatusMessage>Unable to load variant</StatusMessage>
          } else if (!data.variant) {
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
                    ? graphQLErrors.map(err => err.message).join(', ')
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
                {variantId && (
                  <React.Fragment>
                    <VariantType variantId={variantId} />:{' '}
                  </React.Fragment>
                )}
                <VariantId>
                  {variantId || rsId} ({referenceGenomeForDataset(datasetId)})
                </VariantId>
              </GnomadPageHeading>
              {pageContent}
            </React.Fragment>
          )
        }}
      </Query>
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
