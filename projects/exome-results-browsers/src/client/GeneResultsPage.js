import gql from 'graphql-tag'
import React from 'react'
import { graphql } from 'react-apollo'

import { Page, PageHeading } from '@broad/ui'

import GeneResultsTable from './GeneResultsTable'
import StatusMessage from './StatusMessage'

const geneResultsQuery = gql`
  {
    geneResults {
      gene_name
      description
      gene_id
      case_lof
      ctrl_lof
      pval_lof
      case_mpc
      ctrl_mpc
      pval_mpc
      pval_meta
    }
  }
`

const GeneResultsTableWithQuery = graphql(geneResultsQuery)(
  ({ data: { error, loading, geneResults } }) => {
    if (loading) {
      return <StatusMessage>Loading gene results...</StatusMessage>
    }

    if (error) {
      return <StatusMessage>Unable to load gene results</StatusMessage>
    }

    return <GeneResultsTable results={geneResults} />
  }
)

const GeneResultsPage = () => (
  <Page>
    <PageHeading>Exome meta-analysis results</PageHeading>
    <GeneResultsTableWithQuery />
  </Page>
)

export default GeneResultsPage
