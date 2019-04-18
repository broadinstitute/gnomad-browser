import React, { Component } from 'react'
import styled from 'styled-components'

import { Button, Combobox, Page, PageHeading, SearchInput } from '@broad/ui'

import browserConfig from '@browser/config'

import downloadCSV from '../downloadCSV'
import DocumentTitle from '../DocumentTitle'
import Query from '../Query'
import StatusMessage from '../StatusMessage'
import columns from './geneResultColumns'
import GeneResultsTable from './GeneResultsTable'

const geneResultsQuery = `
  query geneResultsForGroup($analysisGroup: AnalysisGroupId!) {
    geneResults(analysis_group: $analysisGroup) {
      gene_id
      gene_name
      gene_description
      categories {
        id
        xcase
        xctrl
        pval
      }
      pval_meta
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
  state = {
    searchText: '',
    selectedAnalysisGroup: browserConfig.analysisGroups.defaultGroup,
  }

  render() {
    const numAvailableGroups = browserConfig.analysisGroups.selectableGroups.length
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
              const filteredResults = data.geneResults.filter(result =>
                (result.gene_name || '').includes(searchText)
              )

              results = filteredResults.map(result => {
                const resultCopy = { ...result }
                result.categories.forEach(c => {
                  resultCopy[`xcase_${c.id}`] = c.xcase
                  resultCopy[`xctrl_${c.id}`] = c.xctrl
                  resultCopy[`pval_${c.id}`] = c.pval
                })
                return resultCopy
              })

              resultsContent = <GeneResultsTable results={results} />
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
                          options={browserConfig.analysisGroups.selectableGroups.map(
                            analysisGroup => ({
                              analysisGroup,
                              label:
                                browserConfig.analysisGroups.labels[analysisGroup] || analysisGroup,
                            })
                          )}
                          value={
                            browserConfig.analysisGroups.labels[selectedAnalysisGroup] ||
                            selectedAnalysisGroup
                          }
                          onSelect={({ analysisGroup }) => {
                            this.setState({ selectedAnalysisGroup: analysisGroup })
                          }}
                        />
                      </AnalysisGroupMenuWrapper>
                    )}

                    <Button
                      disabled={error || loading}
                      onClick={() => {
                        const headerRow = columns.map(col => col.heading)
                        const dataRows = results.map(result => columns.map(col => result[col.key]))
                        downloadCSV(
                          [headerRow].concat(dataRows),
                          `${selectedAnalysisGroup}_results`
                        )
                      }}
                    >
                      Export results to CSV
                    </Button>
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
