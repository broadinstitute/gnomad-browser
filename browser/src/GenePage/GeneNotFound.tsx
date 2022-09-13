import React from 'react'

import { DatasetId, referenceGenome } from '@gnomad/dataset-metadata/metadata'
import Link from '../Link'
import Query from '../Query'
import StatusMessage from '../StatusMessage'

const operationName = 'GeneSearch'
const geneSearchQuery = `
query ${operationName}($query: String!, $referenceGenome: ReferenceGenomeId!) {
  gene_search(query: $query, reference_genome: $referenceGenome) {
    ensembl_id
    symbol
  }
}
`

type Props = {
  datasetId: DatasetId
  geneIdOrSymbol: string
}

const GeneNotFound = ({ datasetId, geneIdOrSymbol }: Props) => {
  const isGeneId = /^ENSG\d{11}$/.test(geneIdOrSymbol.toUpperCase())

  return (
    <>
      <StatusMessage>Gene not found</StatusMessage>
      {!isGeneId && (
        <Query
          operationName={operationName}
          query={geneSearchQuery}
          variables={{
            query: geneIdOrSymbol.slice(0, 2),
            referenceGenome: referenceGenome(datasetId),
          }}
          loadingMessage={null}
          errorMessage={null}
          success={(data: any) => data.gene_search}
        >
          {({ data }: any) => {
            if (!data.gene_search.length) {
              return null
            }

            return (
              <div style={{ textAlign: 'center' }}>
                Did you mean:{' '}
                {data.gene_search
                  .flatMap((gene: any) => [
                    ', ',
                    <Link
                      key={gene.ensembl_id}
                      to={`/gene/${gene.ensembl_id}?dataset=${datasetId}`}
                    >
                      {gene.symbol}
                    </Link>,
                  ])
                  .slice(1)}
              </div>
            )
          }}
        </Query>
      )}
    </>
  )
}

export default GeneNotFound
