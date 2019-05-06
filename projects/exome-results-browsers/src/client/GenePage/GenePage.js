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

const GeneFullName = styled.span`
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
query Gene($geneId: String, $geneName: String) {
  gene(gene_id: $geneId, gene_name: $geneName) {
    gene_id
    gene_name
    full_gene_name
    canonical_transcript
    chrom
    start
    stop
    omim_accession
    results {
      analysis_group
      ${browserConfig.geneResults.columns.map(c => c.key).join('\n')}
    }
    transcript {
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
        n_lof
        n_mis
        n_syn
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
  state = {
    selectedVariantResultsGroup: browserConfig.variants.groups.options[0],
  }

  render() {
    const { geneIdOrName } = this.props
    const { selectedVariantResultsGroup } = this.state

    const variables = geneIdOrName.toUpperCase().startsWith('ENSG')
      ? { geneId: geneIdOrName }
      : { geneName: geneIdOrName }

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
          const canonicalCodingExons = gene.transcript.exons.filter(
            exon => exon.feature_type === 'CDS'
          )

          return (
            <TrackPage>
              <TrackPageSection>
                <DocumentTitle title={gene.gene_name} />
                <PageHeading>
                  {gene.gene_name} <GeneFullName>{gene.full_gene_name}</GeneFullName>
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
                          render: () => (
                            <GnomadConstraintTable constraint={gene.transcript.gnomad_constraint} />
                          ),
                        },
                        {
                          id: 'exac',
                          label: 'ExAC',
                          render: () => (
                            <ExacConstraintTable constraint={gene.transcript.exac_constraint} />
                          ),
                        },
                      ]}
                    />
                  </ConstraintWrapper>
                </TablesWrapper>
              </TrackPageSection>
              <RegionViewer padding={75} regions={canonicalCodingExons}>
                <TranscriptTrack exons={canonicalCodingExons} strand={gene.transcript.strand} />
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

GenePage.propTypes = {
  geneIdOrName: PropTypes.string.isRequired,
}

export default GenePage
