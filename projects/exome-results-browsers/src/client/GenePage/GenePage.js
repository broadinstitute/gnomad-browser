import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { PageHeading, Tabs } from '@broad/ui'

import browserConfig from '@browser/config'
import GeneResult from '@browser/GeneResult'

import DocumentTitle from '../DocumentTitle'
import { HelpPopup } from '../help'
import Query from '../Query'
import sortByGroup from '../sortByGroup'
import StatusMessage from '../StatusMessage'
import RegionViewer from './AutosizedRegionViewer'
import { ExacConstraintTable, GnomadConstraintTable } from './Constraint'
import GeneAttributes from './GeneAttributes'
import { TrackPage, TrackPageSection } from './TrackPage'
import TranscriptTrack from './TranscriptTrack'
import VariantsInGene from './VariantsInGene'

const GeneName = styled.span`
  font-size: 0.75em;
  font-weight: 400;
`

const TablesWrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  margin-bottom: 3em;
`

const ConstraintWrapper = styled.div`
  @media (min-width: 700px) {
    min-width: 415px;
  }
`

const geneQuery = `
query Gene($geneId: String, $geneSymbol: String) {
  gene(gene_id: $geneId, gene_symbol: $geneSymbol) {
    gene_id
    symbol
    name
    chrom
    start
    stop
    omim_id
    results {
      analysis_group
      ${browserConfig.geneResults.columns.map(c => c.key).join('\n')}
    }
    canonical_transcript {
      transcript_id
      strand
      exons {
        feature_type
        start
        stop
      }
      exac_constraint {
        exp_lof
        exp_mis
        exp_syn
        obs_lof
        obs_mis
        obs_syn
        lof_z
        mis_z
        syn_z
        pLI
      }
      gnomad_constraint {
        exp_lof
        exp_mis
        exp_syn
        obs_lof
        obs_mis
        obs_syn
        oe_lof
        oe_mis
        oe_syn
        lof_z
        mis_z
        syn_z
        pLI
      }
    }
  }
}
`

class GenePage extends Component {
  static propTypes = {
    geneIdOrSymbol: PropTypes.string.isRequired,
  }

  state = {
    selectedVariantResultsGroup: browserConfig.variants.groups.options[0],
  }

  render() {
    const { geneIdOrSymbol } = this.props
    const { selectedVariantResultsGroup } = this.state

    const variables = geneIdOrSymbol.toUpperCase().startsWith('ENSG')
      ? { geneId: geneIdOrSymbol }
      : { geneSymbol: geneIdOrSymbol }

    return (
      <Query query={geneQuery} variables={variables}>
        {({ data, error, graphQLErrors, loading }) => {
          if (loading) {
            return <StatusMessage>Loading gene...</StatusMessage>
          }

          if (error) {
            return <StatusMessage>Unable to load gene</StatusMessage>
          }

          if (graphQLErrors && !data.gene) {
            return <StatusMessage>{graphQLErrors.map(err => err.message).join(', ')}</StatusMessage>
          }

          const { gene } = data
          const canonicalCodingExons = gene.canonical_transcript.exons.filter(
            exon => exon.feature_type === 'CDS'
          )

          return (
            <TrackPage>
              <TrackPageSection>
                <DocumentTitle title={gene.symbol} />
                <PageHeading>
                  {gene.symbol} <GeneName>{gene.name}</GeneName>
                </PageHeading>

                <GeneAttributes gene={gene} />
                <TablesWrapper>
                  <div>
                    <h2>
                      Gene Result <HelpPopup topic="geneResult" />
                    </h2>
                    {gene.results.length > 1 ? (
                      <Tabs
                        tabs={sortByGroup(gene.results, browserConfig.geneResults.groups).map(
                          result => ({
                            id: result.analysis_group,
                            label:
                              browserConfig.geneResults.groups.labels[result.analysis_group] ||
                              result.analysis_group,
                            render: () => <GeneResult geneResult={result} />,
                          })
                        )}
                      />
                    ) : (
                      <GeneResult geneResult={gene.results[0]} />
                    )}
                  </div>
                  <ConstraintWrapper>
                    <h2>Gene Constraint</h2>
                    <Tabs
                      tabs={[
                        {
                          id: 'gnomad',
                          label: 'gnomAD',
                          render: () =>
                            gene.canonical_transcript.gnomad_constraint ? (
                              <GnomadConstraintTable
                                constraint={gene.canonical_transcript.gnomad_constraint}
                              />
                            ) : (
                              <p>gnomAD constraint is not available for this gene.</p>
                            ),
                        },
                        {
                          id: 'exac',
                          label: 'ExAC',
                          render: () =>
                            gene.canonical_transcript.exac_constraint ? (
                              <ExacConstraintTable
                                constraint={gene.canonical_transcript.exac_constraint}
                              />
                            ) : (
                              <p>ExAC constraint is not available for this gene.</p>
                            ),
                        },
                      ]}
                    />
                  </ConstraintWrapper>
                </TablesWrapper>
              </TrackPageSection>
              <RegionViewer padding={75} regions={canonicalCodingExons}>
                <TranscriptTrack
                  exons={canonicalCodingExons}
                  strand={gene.canonical_transcript.strand}
                />
                <VariantsInGene
                  gene={gene}
                  selectedAnalysisGroup={selectedVariantResultsGroup}
                  onChangeAnalysisGroup={group => {
                    this.setState({ selectedVariantResultsGroup: group })
                  }}
                />
              </RegionViewer>
            </TrackPage>
          )
        }}
      </Query>
    )
  }
}

export default GenePage
