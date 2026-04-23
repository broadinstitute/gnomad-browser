import React from 'react'
import { isRegionId, parseRegionId } from '@gnomad/identifiers'
import { Page, PageHeading } from '@gnomad/ui'
import { DatasetId, referenceGenome } from '@gnomad/dataset-metadata/metadata'
import DocumentTitle from '../DocumentTitle'
import Query from '../Query'
import PangenomeExplorerPage from './PangenomeExplorerPage'

const operationName = 'Region'
const query = `
  query ${operationName}($chrom: String!, $start: Int!, $stop: Int!, $referenceGenome: ReferenceGenomeId!) {
    region(chrom: $chrom, start: $start, stop: $stop, reference_genome: $referenceGenome) {
      chrom
      start
      stop
    }
  }
`

type Props = { datasetId: DatasetId; regionId: string }

const PangenomeExplorerContainer = ({ datasetId, regionId }: Props) => {
  if (!isRegionId(regionId)) {
    return (
      <Page>
        <DocumentTitle title="Invalid region ID" />
        <PageHeading>Invalid region ID</PageHeading>
      </Page>
    )
  }

  const { chrom, start, stop } = parseRegionId(regionId)

  return (
    <Query
      operationName={operationName}
      query={query}
      variables={{ chrom, start, stop, referenceGenome: referenceGenome(datasetId) }}
      loadingMessage="Loading region"
      errorMessage="Unable to load region"
      success={(data: any) => data.region}
    >
      {({ data }: any) => {
        return (
          <PangenomeExplorerPage
            datasetId={datasetId}
            region={{
              ...data.region,
              reference_genome: referenceGenome(datasetId),
              chrom: chrom === 'MT' ? 'M' : chrom,
              start,
              stop,
            }}
          />
        )
      }}
    </Query>
  )
}
export default PangenomeExplorerContainer
