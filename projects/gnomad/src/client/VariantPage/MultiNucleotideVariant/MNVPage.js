import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { ExternalLink, List, ListItem, Page } from '@broad/ui'

import DocumentTitle from '../../DocumentTitle'
import GnomadPageHeading from '../../GnomadPageHeading'
import StatusMessage from '../../StatusMessage'
import VariantFeedback from '../VariantFeedback'
import VariantNotFound from '../VariantNotFound'
import MNVConsequenceList from './MNVConsequenceList'
import MNVConstituentSNVFrequencyTable from './MNVConstituentSNVFrequencyTable'
import MNVDetailsQuery from './MNVDetailsQuery'
import MNVFrequencyTable from './MNVFrequencyTable'
import MNVReadData from './MNVReadData'
import MNVSummaryList from './MNVSummaryList'

const Section = styled.section`
  width: 100%;
  margin-bottom: 2em;
`

const ColumnWrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  width: 100%;
`

const Column = styled.div`
  width: calc(50% - 15px);

  @media (max-width: 992px) {
    width: 100%;
  }
`

const MNVPage = ({ datasetId, variantId }) => (
  <Page>
    <DocumentTitle title={variantId} />
    <GnomadPageHeading
      datasetOptions={{ includeExac: false, includeStructuralVariants: false }}
      selectedDataset={datasetId}
    >
      Multi-nucleotide variant: {variantId}
    </GnomadPageHeading>
    <MNVDetailsQuery datasetId={datasetId} variantId={variantId}>
      {({ data, error, loading }) => {
        if (loading) {
          return <StatusMessage>Loading variant...</StatusMessage>
        }

        if (error) {
          return <StatusMessage>Unable to load variant</StatusMessage>
        }

        if (!data.multiNucleotideVariant) {
          return <VariantNotFound datasetId={datasetId} variantId={variantId} />
        }

        const variant = data.multiNucleotideVariant

        const numGenes = new Set(variant.consequences.map(csq => csq.gene_id)).size

        return (
          <div>
            <Section>
              <ColumnWrapper>
                <Column>
                  <MNVFrequencyTable variant={variant} />
                  {variant.related_mnvs.length > 0 && (
                    <div>
                      <p>
                        <strong>
                          This variant&apos;s consequence may be affected by other variants:
                        </strong>
                      </p>
                      <MNVSummaryList multiNucleotideVariants={variant.related_mnvs} />
                    </div>
                  )}
                </Column>
                <Column>
                  <h2>References</h2>
                  <List>
                    <ListItem>
                      <ExternalLink
                        // eslint-disable-next-line prettier/prettier
                        href={`http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg19&highlight=hg19.chr${
                          variant.chrom
                        }%3A${variant.pos}-${variant.pos}&position=chr${
                          variant.chrom
                        }%3A${variant.pos - 25}-${variant.pos + 25}`}
                      >
                        UCSC
                      </ExternalLink>
                    </ListItem>
                  </List>
                  <h2>Report</h2>
                  <VariantFeedback datasetId={datasetId} variantId={variantId} />
                </Column>
              </ColumnWrapper>
            </Section>
            <Section>
              <h2>Annotations</h2>
              <p>
                This variant falls in the canonical transcript of {numGenes} gene
                {numGenes !== 1 && 's'}.
              </p>
              <MNVConsequenceList variant={variant} />
            </Section>
            <Section>
              <h2>Constituent SNVs</h2>
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <MNVConstituentSNVFrequencyTable snvs={variant.constituent_snvs} />
              </div>
            </Section>
            <Section>
              <h2>Read Data</h2>
              <p>These reads were generated based on the constituent SNVs, therefore:</p>
              <List>
                <ListItem>A read may not be from an individual carrying the MNV.</ListItem>
                <ListItem>
                  Reads from individuals carrying the MNV may be shown more than once.
                </ListItem>
              </List>
              <MNVReadData variant={variant} />
            </Section>
          </div>
        )
      }}
    </MNVDetailsQuery>
  </Page>
)

MNVPage.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variantId: PropTypes.string.isRequired,
}

export default MNVPage
