import React from 'react'

import { referenceGenome, coverageDatasetId, isExac } from '@gnomad/dataset-metadata/metadata'
import AlleleNumberQuery from '../AlleleNumberQuery'
import { coverageConfigClassic, coverageConfigNew } from '../coverageStyles'
import CoverageTrack from '../CoverageTrack'
import Query from '../Query'

const operationName = 'RegionCoverage'
const coverageQuery = `
query ${operationName}($chrom: String!, $start: Int!, $stop: Int!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!, $includeExomeCoverage: Boolean!, $includeGenomeCoverage: Boolean!) {
  region(chrom: $chrom, start: $start, stop: $stop, reference_genome: $referenceGenome) {
    coverage(dataset: $datasetId) {
      exome @include(if: $includeExomeCoverage) {
        pos
        mean
        median
        over_1
        over_5
        over_10
        over_15
        over_20
        over_25
        over_30
        over_50
        over_100
      }
      genome @include(if: $includeGenomeCoverage) {
        pos
        mean
        median
        over_1
        over_5
        over_10
        over_15
        over_20
        over_25
        over_30
        over_50
        over_100
      }
    }
  }
}
`

const alleleNumberOperationName = 'RegionAlleleNumber'
const alleleNumberQuery = `
query ${alleleNumberOperationName}($chrom: String!, $start: Int!, $stop: Int!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!, $includeExome: Boolean!, $includeGenome: Boolean!) {
  feature: region(chrom: $chrom, start: $start, stop: $stop, reference_genome: $referenceGenome) {
    allele_number(dataset: $datasetId) {
      exome @include(if: $includeExome) {
        pos
        an_percent
      }
      genome @include(if: $includeGenome) {
        pos
        an_percent
      }
    }
  }
}
`

type OwnProps = {
  datasetId: string
  chrom: string
  start: number
  stop: number
  includeExomeCoverage?: boolean
  includeGenomeCoverage?: boolean
}

// @ts-expect-error TS(2456) FIXME: Type alias 'Props' circularly references itself.
type Props = OwnProps & typeof RegionCoverageTrack.defaultProps

// @ts-expect-error TS(7022) FIXME: 'RegionCoverageTrack' implicitly has type 'any' be... Remove this comment to see the full error message
const RegionCoverageTrack = ({
  datasetId,
  chrom,
  start,
  stop,
  includeExomeCoverage,
  includeGenomeCoverage,
}: Props) => {
  return (
    <AlleleNumberQuery
      datasetId={datasetId}
      operationName={alleleNumberOperationName}
      query={alleleNumberQuery}
      variables={{
        chrom,
        start,
        stop,
        includeExome: includeExomeCoverage,
        includeGenome: includeGenomeCoverage,
      }}
    >
      {(alleleNumber) => (
        <Query
          operationName={operationName}
          query={coverageQuery}
          variables={{
            chrom,
            start,
            stop,
            datasetId: coverageDatasetId(datasetId),
            referenceGenome: referenceGenome(coverageDatasetId(datasetId)),
            includeExomeCoverage,
            includeGenomeCoverage,
          }}
          loadingMessage="Loading coverage"
          loadingPlaceholderHeight={220}
          errorMessage="Unable to load coverage"
          success={(data: any) => {
            if (!data.region || !data.region.coverage) {
              return false
            }
            const exomeCoverage = includeExomeCoverage ? data.region.coverage.exome : true
            const genomeCoverage = includeGenomeCoverage ? data.region.coverage.genome : true
            return exomeCoverage || genomeCoverage
          }}
        >
          {({ data }: any) => {
            const exomeCoverage = includeExomeCoverage ? data.region.coverage.exome : null
            const genomeCoverage = includeGenomeCoverage ? data.region.coverage.genome : null

            const coverageConfig = isExac(datasetId)
              ? coverageConfigClassic(exomeCoverage, genomeCoverage)
              : coverageConfigNew(exomeCoverage, genomeCoverage)

            return (
              <CoverageTrack
                coverageOverThresholds={[1, 5, 10, 15, 20, 25, 30, 50, 100]}
                filenameForExport={() => `${chrom}-${start}-${stop}_coverage`}
                datasets={coverageConfig}
                {...alleleNumber}
                height={200}
                datasetId={datasetId}
              />
            )
          }}
        </Query>
      )}
    </AlleleNumberQuery>
  )
}

RegionCoverageTrack.defaultProps = {
  includeExomeCoverage: true,
  includeGenomeCoverage: true,
}

export default RegionCoverageTrack
