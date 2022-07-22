import React from 'react'

import { isRegionId, parseRegionId } from '@gnomad/identifiers'
import { Page, PageHeading } from '@gnomad/ui'

import { referenceGenomeForDataset } from '../datasets'
import DocumentTitle from '../DocumentTitle'
import Query from '../Query'
import RegionPage from './RegionPage'

const query = `
  query Region($chrom: String!, $start: Int!, $stop: Int!, $referenceGenome: ReferenceGenomeId!, $shortTandemRepeatDatasetId: DatasetId!, $includeShortTandemRepeats: Boolean!) {
    region(chrom: $chrom, start: $start, stop: $stop, reference_genome: $referenceGenome) {
      genes {
        gene_id
        symbol
        start
        stop
        exons {
          feature_type
          start
          stop
        }
        transcripts {
          transcript_id
          exons {
            feature_type
            start
            stop
          }
        }
      }
      short_tandem_repeats(dataset: $shortTandemRepeatDatasetId) @include(if: $includeShortTandemRepeats) {
        id
      }
    }
  }
`

type Props = {
  datasetId: string
  regionId: string
}

const RegionPageContainer = ({ datasetId, regionId }: Props) => {
  if (!isRegionId(regionId)) {
    return (
      // @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
      <Page>
        <DocumentTitle title="Invalid region ID" />
        <PageHeading>Invalid region ID</PageHeading>
        <p>Regions IDs must be formatted chrom-start-stop.</p>
      </Page>
    )
  }

  const { chrom, start, stop } = parseRegionId(regionId)
  const referenceGenome = referenceGenomeForDataset(datasetId)

  return (
    <Query
      query={query}
      variables={{
        chrom,
        start,
        stop,
        referenceGenome,
        includeShortTandemRepeats: datasetId.startsWith('gnomad_r3'),
        shortTandemRepeatDatasetId: 'gnomad_r3',
      }}
      loadingMessage="Loading region"
      errorMessage="Unable to load region"
      success={(data: any) => data.region}
    >
      {({ data }: any) => {
        return (
          <RegionPage
            datasetId={datasetId}
            region={{
              ...data.region,
              reference_genome: referenceGenome,
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

export default RegionPageContainer
