import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { QuestionMark } from '@broad/help'
import { Page } from '@broad/ui'

import { referenceGenomeForDataset } from '../datasets'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import Link from '../Link'
import StatusMessage from '../StatusMessage'
import { ReferenceList } from './ReferenceList'
import GnomadAgeDistribution from './GnomadAgeDistribution'
import { GnomadPopulationsTable } from './GnomadPopulationsTable'
import MNVSummaryList from './MultiNucleotideVariant/MNVSummaryList'
import { GnomadGenotypeQualityMetrics } from './qualityMetrics/GnomadGenotypeQualityMetrics'
import { GnomadSiteQualityMetrics } from './qualityMetrics/GnomadSiteQualityMetrics'
import GnomadReadData from './reads/GnomadReadData'
import { TranscriptConsequenceList } from './TranscriptConsequenceList'
import { VariantDetailsQuery } from './VariantDetailsQuery'
import VariantFeedback from './VariantFeedback'
import VariantNotFound from './VariantNotFound'
import { GnomadVariantOccurrenceTable } from './VariantOccurrenceTable'

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

const GnomadVariantPage = ({ datasetId, variantId }) => (
  <Page>
    <DocumentTitle title={variantId} />
    <GnomadPageHeading
      datasetOptions={{
        // ExAC variant page doesn't exist yet
        includeExac: false,
        // Only include gnomAD version on the same reference genome
        includeGnomad2: !datasetId.startsWith('gnomad_r3'),
        includeGnomad3: datasetId.startsWith('gnomad_r3'),
        // Variant ID not valid for SVs
        includeStructuralVariants: false,
      }}
      selectedDataset={datasetId}
    >
      <VariantType variantId={variantId} />:{' '}
      <VariantId>
        {variantId} ({referenceGenomeForDataset(datasetId)})
      </VariantId>
    </GnomadPageHeading>
    <VariantDetailsQuery datasetId={datasetId} variantId={variantId}>
      {({ data, error, loading }) => {
        if (loading) {
          return <StatusMessage>Loading variant...</StatusMessage>
        }

        if (error) {
          return <StatusMessage>Unable to load variant</StatusMessage>
        }

        if (!data.variant) {
          return <VariantNotFound datasetId={datasetId} variantId={variantId} />
        }

        const { variant, clinvar_variant: clinvarVariant } = data

        const numTranscripts = variant.sortedTranscriptConsequences.length
        const geneIds = variant.sortedTranscriptConsequences.map(csq => csq.gene_id)
        const numGenes = new Set(geneIds).size

        return (
          <VariantDetailsContainer>
            <ResponsiveSection>
              <ScrollWrapper>
                <GnomadVariantOccurrenceTable
                  variant={variant}
                  showExomes={!datasetId.startsWith('gnomad_r3')}
                />
              </ScrollWrapper>

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

              {variant.multiNucleotideVariants.length > 0 && (
                <div>
                  <p>
                    <strong>
                      This variant&apos;s consequence may be affected by other variants:
                    </strong>
                  </p>
                  <MNVSummaryList multiNucleotideVariants={variant.multiNucleotideVariants} />
                </div>
              )}
            </ResponsiveSection>
            <ResponsiveSection>
              <h2>References</h2>
              <ReferenceList variant={variant} clinvarVariant={clinvarVariant} />
              <h2>Report</h2>
              <VariantFeedback datasetId={datasetId} variantId={variantId} />
            </ResponsiveSection>
            <Section>
              <h2>Annotations</h2>
              <p>
                This variant falls on {numTranscripts} transcript
                {numTranscripts !== 1 && 's'} in {numGenes} gene
                {numGenes !== 1 && 's'}.
              </p>
              <TranscriptConsequenceList
                sortedTranscriptConsequences={variant.sortedTranscriptConsequences}
              />
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
              {((variant.exome || {}).age_distribution ||
                (variant.genome || {}).age_distribution) && (
                <React.Fragment>
                  <h2>Age Distribution</h2>
                  {datasetId.startsWith('gnomad_r2') && datasetId !== 'gnomad_r2_1' && (
                    <p>
                      Age distribution is based on the full gnomAD dataset, not the selected subset.
                    </p>
                  )}
                  <GnomadAgeDistribution datasetId={datasetId} variant={variant} />
                </React.Fragment>
              )}
            </ResponsiveSection>
            <ResponsiveSection>
              <h2>Genotype Quality Metrics</h2>
              <GnomadGenotypeQualityMetrics variant={variant} />
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
      }}
    </VariantDetailsQuery>
  </Page>
)

GnomadVariantPage.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variantId: PropTypes.string.isRequired,
}

export default GnomadVariantPage
