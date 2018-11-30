import React, { Component } from 'react'
import styled from 'styled-components'

import { Combobox, Page, PageHeading, Search } from '@broad/ui'

import browserConfig from '@browser/config'

import Query from '../Query'
import StatusMessage from '../StatusMessage'
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
  margin-bottom: 1em;
`

class GeneResultsPage extends Component {
  state = {
    searchText: '',
    selectedAnalysisGroup: browserConfig.analysisGroups.overallGroup,
  }

  renderAnalysisGroupMenu() {
    const numAvailableGroups = browserConfig.analysisGroups.selectableGroups.length

    if (numAvailableGroups === 1) {
      return <div />
    }

    const { selectedAnalysisGroup } = this.state

    return (
      <div>
        {/* eslint-disable-next-line jsx-a11y/label-has-for,jsx-a11y/label-has-associated-control */}
        <label htmlFor="analysis-group-menu">Current analysis group </label>
        <Combobox
          id="analysis-group-menu"
          options={browserConfig.analysisGroups.selectableGroups.map(analysisGroup => ({
            analysisGroup,
            label: analysisGroup,
          }))}
          value={selectedAnalysisGroup}
          onSelect={({ analysisGroup }) => {
            this.setState({ selectedAnalysisGroup: analysisGroup })
          }}
        />
      </div>
    )
  }

  render() {
    const { selectedAnalysisGroup } = this.state

    return (
      <Page>
        <PageHeading>{browserConfig.geneResults.resultsPageHeading}</PageHeading>
        <ControlSection>
          {this.renderAnalysisGroupMenu()}

          <Search
            placeholder="Search results by gene"
            onChange={value => {
              this.setState({ searchText: value.toUpperCase() })
            }}
          />
        </ControlSection>
        <Query query={geneResultsQuery} variables={{ analysisGroup: selectedAnalysisGroup }}>
          {({ data, error, loading }) => {
            if (loading) {
              return <StatusMessage>Loading gene results...</StatusMessage>
            }

            if (error) {
              return <StatusMessage>Unable to load gene results</StatusMessage>
            }

            const { searchText } = this.state
            const filteredResults = data.geneResults.filter(result =>
              (result.gene_name || '').includes(searchText)
            )

            const shapedResults = filteredResults.map(result => {
              const resultCopy = { ...result }
              result.categories.forEach(c => {
                resultCopy[`xcase_${c.id}`] = c.xcase
                resultCopy[`xctrl_${c.id}`] = c.xctrl
                resultCopy[`pval_${c.id}`] = c.pval
              })
              return resultCopy
            })

            return <GeneResultsTable results={shapedResults} />
          }}
        </Query>
      </Page>
    )
  }
}

export default GeneResultsPage
