import React from 'react'

import { isRegionId, parseRegionId } from '@gnomad/identifiers'
import { Page, PageHeading } from '@gnomad/ui'

import {
  DatasetId,
  labelForDataset,
  referenceGenome,
  hasShortTandemRepeats,
} from '@gnomad/dataset-metadata/metadata'
import DocumentTitle from '../DocumentTitle'
import Query from '../Query'
import RequestRevalidationFrame from '../RequestRevalidationFrame'
import RegionPage from './RegionPage'

const operationName = 'Region'
const query = `
  query ${operationName}($chrom: String!, $start: Int!, $stop: Int!, $referenceGenome: ReferenceGenomeId!, $shortTandemRepeatDatasetId: DatasetId!, $includeShortTandemRepeats: Boolean!) {
    meta {
      long_read_cohorts
    }
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
      non_coding_constraints {
        start
        stop
        oe
        z
      }
      short_tandem_repeats(dataset: $shortTandemRepeatDatasetId) @include(if: $includeShortTandemRepeats) {
        id
      }
    }
  }
`

type Props = {
  datasetId: DatasetId
  regionId: string
}

const RegionPageContainer = ({ datasetId, regionId }: Props) => {
  if (!isRegionId(regionId)) {
    return (
      <Page>
        <DocumentTitle title="Invalid region ID" />
        <PageHeading>Invalid region ID</PageHeading>
        <p>Regions IDs must be formatted chrom-start-stop.</p>
      </Page>
    )
  }

  const { chrom, start, stop } = parseRegionId(regionId)

  return (
    <Query
      operationName={operationName}
      query={query}
      requestKey={datasetId}
      retainPreviousData
      variables={{
        chrom,
        start,
        stop,
        referenceGenome: referenceGenome(datasetId),
        includeShortTandemRepeats: hasShortTandemRepeats(datasetId),
        shortTandemRepeatDatasetId: 'gnomad_r3',
      }}
      loadingMessage="Loading region"
      errorMessage="Unable to load region"
      success={(data: any) => data.region}
    >
      {({ data, requestKey: loadedDatasetId = datasetId, requestVariables, stale }: any) => {
        const loadedChrom = requestVariables?.chrom || chrom
        const loadedStart = requestVariables?.start || start
        const loadedStop = requestVariables?.stop || stop
        return (
          <RequestRevalidationFrame
            stale={stale}
            testId="region-request-shell"
            message={`Updating region for ${labelForDataset(datasetId)}…`}
            focusAfterUpdateSelector={`a[href*="dataset=${datasetId}"]`}
          >
            <RegionPage
              key={loadedDatasetId}
              datasetId={loadedDatasetId}
              availableLrCohorts={data.meta?.long_read_cohorts || ['hgsvc_hprc']}
              region={{
                ...data.region,
                reference_genome: referenceGenome(loadedDatasetId),
                chrom: loadedChrom === 'MT' ? 'M' : loadedChrom,
                start: loadedStart,
                stop: loadedStop,
              }}
            />
          </RequestRevalidationFrame>
        )
      }}
    </Query>
  )
}

export default RegionPageContainer
