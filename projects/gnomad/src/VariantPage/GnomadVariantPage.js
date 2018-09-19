import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { Loading, Page, PageHeading, SectionHeading } from '@broad/ui'

import { ReferenceList } from './ReferenceList'
import { GnomadPopulationsTable } from './GnomadPopulationsTable'
import { GnomadGenotypeQualityMetrics } from './qualityMetrics/GnomadGenotypeQualityMetrics'
import { GnomadSiteQualityMetrics } from './qualityMetrics/GnomadSiteQualityMetrics'
import { GnomadReadData } from './reads/GnomadReadData'
import { TranscriptConsequenceList } from './TranscriptConsequenceList'
import { VariantDetailsQuery } from './VariantDetailsQuery'
import { GnomadVariantOccurrenceTable } from './VariantOccurrenceTable'

const Section = styled.section`
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

export const GnomadVariantPage = ({ variantId }) => (
  <Page>
    <PageHeading>Variant: {variantId}</PageHeading>
    <VariantDetailsQuery dataset="gnomad" variantId={variantId}>
      {({ data, error, loading }) => {
        if (loading) {
          return <Loading>Loading...</Loading>
        }

        if (error) {
          return <Loading>Error</Loading>
        }

        if (!data.variant) {
          return <Loading>Variant not found</Loading>
        }

        const variant = data.variant

        const numTranscripts = variant.sortedTranscriptConsequences.length
        const geneIds = variant.sortedTranscriptConsequences.map(csq => csq.gene_id)
        const numGenes = new Set(geneIds).size

        return (
          <VariantDetailsContainer>
            <ResponsiveSection>
              <GnomadVariantOccurrenceTable variant={variant} />
            </ResponsiveSection>
            <ResponsiveSection>
              <SectionHeading>References</SectionHeading>
              <ReferenceList variant={variant} />
            </ResponsiveSection>
            <ResponsiveSection>
              <SectionHeading>Annotations</SectionHeading>
              <p>
                This variant falls on {numTranscripts} transcript(s) in {numGenes} gene(s).
              </p>
              <TranscriptConsequenceList
                sortedTranscriptConsequences={variant.sortedTranscriptConsequences}
              />
            </ResponsiveSection>
            <ResponsiveSection>
              <SectionHeading>Population Frequencies</SectionHeading>
              <GnomadPopulationsTable
                exomePopulations={variant.exome ? variant.exome.populations : []}
                genomePopulations={variant.genome ? variant.genome.populations : []}
              />
            </ResponsiveSection>
            <ResponsiveSection>
              <SectionHeading>Genotype Quality Metrics</SectionHeading>
              <GnomadGenotypeQualityMetrics variant={variant} />
            </ResponsiveSection>
            <ResponsiveSection>
              <SectionHeading>Site Quality Metrics</SectionHeading>
              <GnomadSiteQualityMetrics variant={variant} />
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
  variantId: PropTypes.string.isRequired,
}
