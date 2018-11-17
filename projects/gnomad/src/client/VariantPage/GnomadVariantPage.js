import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { Link as StyledLink, List, ListItem, Page, SectionHeading } from '@broad/ui'

import GnomadPageHeading from '../GnomadPageHeading'
import Link from '../Link'
import StatusMessage from '../StatusMessage'
import { ReferenceList } from './ReferenceList'
import GnomadAgeDistribution from './GnomadAgeDistribution'
import GnomadMultiNucleotideVariantsSection from './GnomadMultiNucleotideVariantsSection'
import { GnomadPopulationsTable } from './GnomadPopulationsTable'
import { GnomadGenotypeQualityMetrics } from './qualityMetrics/GnomadGenotypeQualityMetrics'
import { GnomadSiteQualityMetrics } from './qualityMetrics/GnomadSiteQualityMetrics'
import { GnomadReadData } from './reads/GnomadReadData'
import { TranscriptConsequenceList } from './TranscriptConsequenceList'
import { VariantDetailsQuery } from './VariantDetailsQuery'
import VariantNotFound from './VariantNotFound'
import { GnomadVariantOccurrenceTable } from './VariantOccurrenceTable'

const Section = styled.section`
  width: 100%;
  margin-bottom: 2em;
`

const ResponsiveSection = Section.extend`
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

const variantPageDatasets = [
  'gnomad_r2_1',
  'gnomad_r2_1_controls',
  'gnomad_r2_1_non_cancer',
  'gnomad_r2_1_non_neuro',
  'gnomad_r2_1_non_topmed',
]

const reportURL = variantId => {
  const reportTemplate = `
Name:
Institution:

Variant ID: ${variantId}

Variant issue: (clinically implausible, read support poor, other artifact, etc.)
Please explain your concern about this variant
`

  return `mailto:exomeconsortium@gmail.com?subject=${encodeURIComponent(
    'Variant report'
  )}&body=${encodeURIComponent(reportTemplate)}`
}

const requestURL = variantId => {
  const requestTemplate = `
Name:
Institution:

Variant ID: ${variantId}

Expected phenotype:

Additional information that may be helpful for our understanding of the request:
`

  return `mailto:exomeconsortium@gmail.com?subject=${encodeURIComponent(
    'Request for variant information'
  )}&body=${encodeURIComponent(requestTemplate)}`
}

const GnomadVariantPage = ({ datasetId, variantId }) => (
  <Page>
    <GnomadPageHeading datasetOptions={variantPageDatasets} selectedDataset={datasetId}>
      Variant: {variantId}
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

        const variant = data.variant

        const numTranscripts = variant.sortedTranscriptConsequences.length
        const geneIds = variant.sortedTranscriptConsequences.map(csq => csq.gene_id)
        const numGenes = new Set(geneIds).size

        return (
          <VariantDetailsContainer>
            <ResponsiveSection>
              <GnomadVariantOccurrenceTable variant={variant} />

              {variant.colocatedVariants.length > 0 && (
                <div>
                  <p>
                    <strong>This variant is multiallelic. Other alt alleles are:</strong>
                  </p>
                  <ul>
                    {variant.colocatedVariants.map(variantId => (
                      <li key={variantId}>
                        <Link to={`/variant/${variantId}`}>{variantId}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <GnomadMultiNucleotideVariantsSection
                multiNucleotideVariants={variant.multiNucleotideVariants}
                thisVariantId={variantId}
              />
            </ResponsiveSection>
            <ResponsiveSection>
              <SectionHeading>References</SectionHeading>
              <ReferenceList variant={variant} />
              <SectionHeading>Report</SectionHeading>
              <List>
                <ListItem>
                  <StyledLink href={reportURL(variantId)}>Report this variant</StyledLink>
                </ListItem>
                <ListItem>
                  <StyledLink href={requestURL(variantId)}>
                    Request additional information
                  </StyledLink>
                </ListItem>
              </List>
            </ResponsiveSection>
            <Section>
              <SectionHeading>Annotations</SectionHeading>
              <p>
                This variant falls on {numTranscripts} transcript(s) in {numGenes} gene(s).
              </p>
              <TranscriptConsequenceList
                sortedTranscriptConsequences={variant.sortedTranscriptConsequences}
              />
            </Section>
            <ResponsiveSection>
              <SectionHeading>Population Frequencies</SectionHeading>
              <GnomadPopulationsTable
                exomePopulations={variant.exome ? variant.exome.populations : []}
                genomePopulations={variant.genome ? variant.genome.populations : []}
                showHemizygotes={variant.chrom === 'X' || variant.chrom === 'Y'}
              />
            </ResponsiveSection>
            <ResponsiveSection>
              <SectionHeading>Age Distribution</SectionHeading>
              <GnomadAgeDistribution variant={variant} />
            </ResponsiveSection>
            <ResponsiveSection>
              <SectionHeading>Genotype Quality Metrics</SectionHeading>
              <GnomadGenotypeQualityMetrics variant={variant} />
            </ResponsiveSection>
            <ResponsiveSection>
              <SectionHeading>Site Quality Metrics</SectionHeading>
              <GnomadSiteQualityMetrics datasetId={datasetId} variant={variant} />
            </ResponsiveSection>
            <Section>
              <SectionHeading>Read Data</SectionHeading>
              <GnomadReadData variant={variant} />
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
