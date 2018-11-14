import React from 'react'

import { Page, PageHeading } from '@broad/ui'

import OverallGeneResultsTable from './OverallGeneResultsTable'
import Query from './Query'
import StatusMessage from './StatusMessage'

const geneResultsQuery = `
  {
    overallGeneResults {
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

const OverallGeneResultsPage = () => (
  <Page>
    <PageHeading>{BROWSER_CONFIG.geneResults.resultsPageHeading}</PageHeading>
    <Query query={geneResultsQuery}>
      {({ data, error, loading }) => {
        if (loading) {
          return <StatusMessage>Loading gene results...</StatusMessage>
        }

        if (error) {
          return <StatusMessage>Unable to load gene results</StatusMessage>
        }

        const shapedResults = data.overallGeneResults.map(result => {
          const resultCopy = { ...result }
          result.categories.forEach(c => {
            resultCopy[`xcase_${c.id}`] = c.xcase
            resultCopy[`xctrl_${c.id}`] = c.xctrl
            resultCopy[`pval_${c.id}`] = c.pval
          })
          return resultCopy
        })

        return <OverallGeneResultsTable results={shapedResults} />
      }}
    </Query>
  </Page>
)

export default OverallGeneResultsPage
