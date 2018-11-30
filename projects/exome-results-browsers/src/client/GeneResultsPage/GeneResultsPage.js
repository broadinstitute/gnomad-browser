import React from 'react'

import { Page, PageHeading } from '@broad/ui'

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

const GeneResultsPage = () => (
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

        const shapedResults = data.geneResults.map(result => {
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

export default GeneResultsPage
