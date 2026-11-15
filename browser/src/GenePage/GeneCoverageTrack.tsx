import React from 'react'

import { isExac } from '@gnomad/dataset-metadata/metadata'
import { coverageConfigClassic, coverageConfigNew } from '../coverageStyles'
import CoverageTrack from '../CoverageTrack'
import Query from '../Query'
import {
  buildGeneCoverageVariables,
  geneCoverageOperationName,
  geneCoverageQuery,
} from './genePageQueries'

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
  return (
    <Query
      operationName={geneCoverageOperationName}
      query={geneCoverageQuery}
      variables={buildGeneCoverageVariables(datasetId, geneId, {
        includeExomeCoverage,
        includeGenomeCoverage,
      })}
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

        return (
          <CoverageTrack
            coverageOverThresholds={[1, 5, 10, 15, 20, 25, 30, 50, 100]}
            datasets={coverageConfig}
            filenameForExport={() => `${geneId}_coverage`}
            height={190}
            datasetId={datasetId}
          />
        )
      }}
    </Query>
  )
}

GeneCoverageTrack.defaultProps = {
  includeExomeCoverage: true,
  includeGenomeCoverage: true,
}

export default GeneCoverageTrack
