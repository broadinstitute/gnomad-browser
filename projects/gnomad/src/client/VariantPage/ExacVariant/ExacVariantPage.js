import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { Page } from '@broad/ui'

import DocumentTitle from '../../DocumentTitle'
import GnomadPageHeading from '../../GnomadPageHeading'
import Link from '../../Link'
import StatusMessage from '../../StatusMessage'
import { PopulationsTable } from '../PopulationsTable'
import { ReferenceList } from '../ReferenceList'
import { TranscriptConsequenceList } from '../TranscriptConsequenceList'
import { VariantDetailsQuery } from '../VariantDetailsQuery'
import VariantFeedback from '../VariantFeedback'
import VariantNotFound from '../VariantNotFound'
import ExacAgeDistribution from './ExacAgeDistribution'
import ExacVariantAttributeList from './ExacVariantAttributeList'
import ExacVariantGenotypeQualityMetrics from './ExacVariantGenotypeQualityMetrics'
import ExacSiteQualityMetrics from './ExacSiteQualityMetrics'

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

const populationNames = {
  AFR: 'African',
  AMR: 'Latino',
  EAS: 'East Asian',
  FIN: 'European (Finnish)',
  NFE: 'European (non-Finnish)',
  OTH: 'Other',
  SAS: 'South Asian',
}

const ExacVariantPage = ({ datasetId, variantId }) => (
  <Page>
    <DocumentTitle title={variantId} />
    <GnomadPageHeading
      datasetOptions={{ includeExac: false, includeStructuralVariants: false }}
      selectedDataset={datasetId}
    >
      <VariantType variantId={variantId} />: <VariantId>{variantId}</VariantId>
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

        const { variant } = data

        const numTranscripts = variant.sortedTranscriptConsequences.length
        const geneIds = variant.sortedTranscriptConsequences.map(csq => csq.gene_id)
        const numGenes = new Set(geneIds).size

        return (
          <VariantDetailsContainer>
            <ResponsiveSection>
              <ExacVariantAttributeList variant={variant} />

              {variant.other_alt_alleles.length > 0 && (
                <div>
                  <p>
                    <strong>This variant is multiallelic. Other alt alleles are:</strong>
                  </p>
                  <ul>
                    {variant.other_alt_alleles.map(otherVariantId => (
                      <li key={otherVariantId}>
                        <Link to={`/variant/${otherVariantId}`}>{otherVariantId}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </ResponsiveSection>
            <ResponsiveSection>
              <h2>References</h2>
              <ReferenceList variant={variant} />
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
              <h2>Population Frequencies</h2>
              <ScrollWrapper>
                <PopulationsTable
                  populations={variant.populations.map(pop => ({
                    ...pop,
                    name: populationNames[pop.id],
                  }))}
                  showHemizygotes={variant.chrom === 'X' || variant.chrom === 'Y'}
                />
              </ScrollWrapper>
            </ResponsiveSection>
            <ResponsiveSection>
              <h2>Age Distribution</h2>
              <ExacAgeDistribution variant={variant} />
            </ResponsiveSection>
            <ResponsiveSection>
              <h2>Genotype Quality Metrics</h2>
              <ExacVariantGenotypeQualityMetrics variant={variant} />
            </ResponsiveSection>
            <ResponsiveSection>
              <h2>Site Quality Metrics</h2>
              <ExacSiteQualityMetrics variant={variant} />
            </ResponsiveSection>
          </VariantDetailsContainer>
        )
      }}
    </VariantDetailsQuery>
  </Page>
)

ExacVariantPage.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variantId: PropTypes.string.isRequired,
}

export default ExacVariantPage
