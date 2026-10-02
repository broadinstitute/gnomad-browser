import React from 'react'

import { referenceGenome, isExac, coverageDatasetId } from '@gnomad/dataset-metadata/metadata'
import { anConfig, coverageConfigClassic, coverageConfigNew } from '../coverageStyles'
import CoverageTrack from '../CoverageTrack'
import Query, { BaseQuery } from '../Query'

const operationName = 'GeneCoverage'
const coverageQuery = `
query ${operationName}($geneId: String!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!, $includeExomeCoverage: Boolean!, $includeGenomeCoverage: Boolean!) {
  gene(gene_id: $geneId, reference_genome: $referenceGenome) {
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

// Allele number is requested separately, and deliberately not folded into the
// coverage query above. A single document would make the coverage track fail
// outright against an API that predates the `allele_number` field -- an unknown
// field is a query validation error, not a null -- so the browser could not be
// deployed ahead of the API. Fetched through BaseQuery rather than Query because
// BaseQuery renders its children regardless of loading or error state, which is
// what lets the coverage track draw normally when AN is unavailable.
const alleleNumberOperationName = 'GeneAlleleNumber'
const alleleNumberQuery = `
query ${alleleNumberOperationName}($geneId: String!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!, $includeExomeCoverage: Boolean!, $includeGenomeCoverage: Boolean!) {
  gene(gene_id: $geneId, reference_genome: $referenceGenome) {
    allele_number(dataset: $datasetId) {
      exome @include(if: $includeExomeCoverage) {
        pos
        an
        an_percent
      }
      genome @include(if: $includeGenomeCoverage) {
        pos
        an
        an_percent
      }
    }
  }
}
`

type OwnProps = {
  datasetId: string
  geneId: string
  includeExomeCoverage?: boolean
  includeGenomeCoverage?: boolean
}

// @ts-expect-error TS(2456) FIXME: Type alias 'Props' circularly references itself.
type Props = OwnProps & typeof GeneCoverageTrack.defaultProps

// @ts-expect-error TS(7022) FIXME: 'GeneCoverageTrack' implicitly has type 'any' beca... Remove this comment to see the full error message
const GeneCoverageTrack = ({
  datasetId,
  geneId,
  includeExomeCoverage,
  includeGenomeCoverage,
}: Props) => {
  const variables = {
    geneId,
    datasetId: coverageDatasetId(datasetId),
    referenceGenome: referenceGenome(coverageDatasetId(datasetId)),
    includeExomeCoverage,
    includeGenomeCoverage,
  }

  return (
    <BaseQuery
      operationName={alleleNumberOperationName}
      query={alleleNumberQuery}
      variables={variables}
    >
      {({ data: alleleNumberData }: any) => (
        <Query
          operationName={operationName}
          query={coverageQuery}
          variables={variables}
          loadingMessage="Loading coverage"
          loadingPlaceholderHeight={220}
          errorMessage="Unable to load coverage"
          success={(data: any) => {
            if (!data.gene || !data.gene.coverage) {
              return false
            }
            const exomeCoverage = includeExomeCoverage ? data.gene.coverage.exome : true
            const genomeCoverage = includeGenomeCoverage ? data.gene.coverage.genome : true
            return exomeCoverage || genomeCoverage
          }}
        >
          {({ data }: any) => {
            const exomeCoverage = includeExomeCoverage ? data.gene.coverage.exome : null
            const genomeCoverage = includeGenomeCoverage ? data.gene.coverage.genome : null

            const coverageConfig = isExac(datasetId)
              ? coverageConfigClassic(exomeCoverage, genomeCoverage)
              : coverageConfigNew(exomeCoverage, genomeCoverage)

            // Absent for a dataset with no AN index, an API without the field, or
            // while the request is still in flight. Empty arrays are normalised to
            // null because anConfig treats any truthy value as a series to draw, so
            // `[]` would add a legend entry for a series with no data.
            const alleleNumber = alleleNumberData?.gene?.allele_number
            const exomeAN =
              includeExomeCoverage && alleleNumber?.exome?.length ? alleleNumber.exome : null
            const genomeAN =
              includeGenomeCoverage && alleleNumber?.genome?.length ? alleleNumber.genome : null

            return (
              <CoverageTrack
                coverageOverThresholds={[1, 5, 10, 15, 20, 25, 30, 50, 100]}
                datasets={coverageConfig}
                anDatasets={exomeAN || genomeAN ? anConfig(exomeAN, genomeAN) : undefined}
                filenameForExport={() => `${geneId}_coverage`}
                height={190}
                datasetId={datasetId}
              />
            )
          }}
        </Query>
      )}
    </BaseQuery>
  )
}

GeneCoverageTrack.defaultProps = {
  includeExomeCoverage: true,
  includeGenomeCoverage: true,
}

export default GeneCoverageTrack
