import React, { Component } from 'react'
import styled from 'styled-components'

import { Page, PageHeading, Search } from '@broad/ui'

import browserConfig from '@browser/config'

import Query from '../Query'
import StatusMessage from '../StatusMessage'
import GeneResultsTable from './GeneResultsTable'

const geneResultsQuery = `
  {
    geneResults(analysis_group: ${browserConfig.analysisGroups.overallGroup}) {
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
  justify-content: flex-end;
  margin-bottom: 1em;
`

class GeneResultsPage extends Component {
  state = {
    searchText: '',
  }

  render() {
    return (
      <Page>
        <PageHeading>{browserConfig.geneResults.resultsPageHeading}</PageHeading>
        <Query query={geneResultsQuery}>
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

            return (
              <div>
                <ControlSection>
                  <Search
                    placeholder="Search results by gene"
                    onChange={value => {
                      this.setState({ searchText: value.toUpperCase() })
                    }}
                  />
                </ControlSection>
                <GeneResultsTable results={shapedResults} />
              </div>
            )
          }}
        </Query>
      </Page>
    )
  }
}

export default GeneResultsPage
