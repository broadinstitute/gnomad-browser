import React from 'react'
import styled from 'styled-components'

import { ExternalLink, List, ListItem, Page } from '@gnomad/ui'

import { labelForDataset } from '../datasets'
import Delayed from '../Delayed'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import ReadData from '../ReadData/ReadData'
import StatusMessage from '../StatusMessage'
import { variantFeedbackUrl } from '../variantFeedback'
import VariantNotFound from '../VariantPage/VariantNotFound'
import MNVConsequenceList from './MNVConsequenceList'
import MNVConstituentSNVFrequencyTable from './MNVConstituentSNVFrequencyTable'
import MNVDetailsQuery from './MNVDetailsQuery'
import MNVFrequencyTable from './MNVFrequencyTable'
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

type Props = {
  datasetId: string
  variantId: string
}

const MNVPage = ({ datasetId, variantId }: Props) => (
  // @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
  <Page>
    <DocumentTitle title={`${variantId} | ${labelForDataset(datasetId)}`} />
    <GnomadPageHeading
      datasetOptions={{
        includeExac: false,
        includeGnomad3: false,
        includeGnomad2Subsets: false,
        includeStructuralVariants: false,
      }}
      selectedDataset={datasetId}
    >
      Multi-nucleotide variant: {variantId}
    </GnomadPageHeading>
    <MNVDetailsQuery datasetId={datasetId} variantId={variantId}>
      {({ data, error, loading }) => {
        if (loading) {
          return (
            <Delayed>
              <StatusMessage>Loading variant...</StatusMessage>
            </Delayed>
          )
        }

        if (error) {
          return <StatusMessage>Unable to load variant</StatusMessage>
        }

        if (!data.multiNucleotideVariant) {
          // @ts-expect-error TS(2322) FIXME: Type '{ datasetId: string; variantId: string; }' i... Remove this comment to see the full error message
          return <VariantNotFound datasetId={datasetId} variantId={variantId} />
        }

        const variant = data.multiNucleotideVariant

        const numGenes = new Set(variant.consequences.map((csq: any) => csq.gene_id)).size

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
                  {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                  <List>
                    {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                    <ListItem>
                      {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
                      <ExternalLink
                        href={`https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg19&highlight=hg19.chr${
                          variant.chrom
                        }%3A${variant.pos}-${variant.pos}&position=chr${variant.chrom}%3A${
                          variant.pos - 25
                        }-${variant.pos + 25}`}
                      >
                        UCSC
                      </ExternalLink>
                    </ListItem>
                  </List>
                  <h2>Feedback</h2>
                  {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
                  <ExternalLink href={variantFeedbackUrl(variant, datasetId)}>
                    Report an issue with this variant
                  </ExternalLink>
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
              {/* @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
              <List>
                {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <ListItem>A read may not be from an individual carrying the MNV.</ListItem>
                {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <ListItem>
                  Reads from individuals carrying the MNV may be shown more than once.
                </ListItem>
              </List>
              <ReadData
                datasetId={datasetId}
                variantIds={variant.constituent_snvs.map((snv: any) => snv.variant_id)}
              />
            </Section>
          </div>
        )
      }}
    </MNVDetailsQuery>
  </Page>
)

export default MNVPage
