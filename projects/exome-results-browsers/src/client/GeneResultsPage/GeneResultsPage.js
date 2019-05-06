import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { Button, Combobox, Page as BasePage, PageHeading, SearchInput, Tabs } from '@broad/ui'

import browserConfig from '@browser/config'

import downloadCSV from '../downloadCSV'
import DocumentTitle from '../DocumentTitle'
import Query from '../Query'
import StatusMessage from '../StatusMessage'
import columns from './geneResultColumns'
import GeneResultsManhattanPlot from './GeneResultsManhattanPlot'
import GeneResultsQQPlot from './GeneResultsQQPlot'
import GeneResultsTable from './GeneResultsTable'

const Page = styled(BasePage)`
  max-width: 1600px;
`

const geneResultColumns = browserConfig.geneResults.columns

const geneResultsQuery = `
  query geneResultsForGroup($analysisGroup: GeneResultGroupId!) {
    geneResults(analysis_group: $analysisGroup) {
      gene_id
      gene_name
      gene_description
      chrom
      pos
      ${geneResultColumns.map(c => c.key).join('\n')}
    }
  }
`

const ControlSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 1em;
`

const AnalysisGroupMenuWrapper = styled.div`
  margin-bottom: 1em;
`

class GeneResultsPage extends Component {
  static propTypes = {
    history: PropTypes.shape({
      push: PropTypes.func.isRequired,
    }).isRequired,
  }

  state = {
    searchText: '',
    selectedAnalysisGroup: browserConfig.geneResults.groups.options[0],
  }

  render() {
    const { history } = this.props

    const numAvailableGroups = browserConfig.geneResults.groups.options.length
    const { selectedAnalysisGroup, searchText } = this.state

    return (
      <Page>
        <DocumentTitle title="Results" />
        <PageHeading>{browserConfig.geneResults.resultsPageHeading}</PageHeading>
        <Query
          cacheKey={`gene-results:${selectedAnalysisGroup}`}
          query={geneResultsQuery}
          variables={{ analysisGroup: selectedAnalysisGroup }}
        >
          {({ data, error, loading }) => {
            let results = []
            let resultsContent
            if (loading) {
              resultsContent = <StatusMessage>Loading gene results...</StatusMessage>
            } else if (error) {
              resultsContent = <StatusMessage>Unable to load gene results</StatusMessage>
            } else {
              results = data.geneResults.filter(
                result =>
                  (result.gene_name || '').includes(searchText) ||
                  (result.gene_description || '').toUpperCase().includes(searchText)
              )

              if (browserConfig.geneResults.views.manhattan || browserConfig.geneResults.views.qq) {
                const tabs = [
                  {
                    id: 'table',
                    label: 'Table',
                    render: () => <GeneResultsTable results={results} />,
                  },
                ]

                if (browserConfig.geneResults.views.manhattan) {
                  tabs.push({
                    id: 'manhattan-plot',
                    label: 'Manhattan Plot',
                    render: () => (
                      <GeneResultsManhattanPlot
                        results={results}
                        onClickPoint={d => {
                          history.push(`/gene/${d.gene_id || d.gene_name}`)
                        }}
                      />
                    ),
                  })
                }

                if (browserConfig.geneResults.views.qq) {
                  tabs.push({
                    id: 'qq-plot',
                    label: 'QQ Plot',
                    render: () => (
                      <GeneResultsQQPlot
                        results={results}
                        onClickPoint={d => {
                          history.push(`/gene/${d.gene_id || d.gene_name}`)
                        }}
                      />
                    ),
                  })
                }

                resultsContent = <Tabs tabs={tabs} />
              } else {
                resultsContent = <GeneResultsTable results={results} />
              }
            }

            return (
              <div>
                <ControlSection>
                  <div>
                    {numAvailableGroups > 1 && (
                      <AnalysisGroupMenuWrapper>
                        {/* eslint-disable-next-line jsx-a11y/label-has-for,jsx-a11y/label-has-associated-control */}
                        <label htmlFor="analysis-group-menu">Current analysis group </label>
                        <Combobox
                          disabled={error || loading}
                          id="analysis-group-menu"
                          options={browserConfig.geneResults.groups.options.map(groupId => ({
                            groupId,
                            label: browserConfig.geneResults.groups.labels[groupId] || groupId,
                          }))}
                          value={
                            browserConfig.geneResults.groups.labels[selectedAnalysisGroup] ||
                            selectedAnalysisGroup
                          }
                          onSelect={({ groupId }) => {
                            this.setState({ selectedAnalysisGroup: groupId })
                          }}
                        />
                      </AnalysisGroupMenuWrapper>
                    )}

                    {!browserConfig.geneResults.hideExport && (
                      <Button
                        disabled={error || loading}
                        onClick={() => {
                          const headerRow = columns.map(col => col.heading)
                          const dataRows = results.map(result =>
                            columns.map(col => result[col.key])
                          )
                          downloadCSV(
                            [headerRow].concat(dataRows),
                            `${selectedAnalysisGroup}_results`
                          )
                        }}
                      >
                        Export results to CSV
                      </Button>
                    )}
                  </div>

                  <SearchInput
                    disabled={error || loading}
                    placeholder="Search results by gene"
                    onChange={value => {
                      this.setState({ searchText: value.toUpperCase() })
                    }}
                  />
                </ControlSection>
                {resultsContent}
              </div>
            )
          }}
        </Query>
      </Page>
    )
  }
}

export default GeneResultsPage
