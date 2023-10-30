import { UserVisibleError } from '../errors'

import { extendRegions, mergeOverlappingRegions, totalRegionSize } from './helpers/region-helpers'

import { assertDatasetAndReferenceGenomeMatch } from './helpers/validation-helpers'

const COVERAGE_INDICES = {
  gnomad_cnv_r4: {
    track_callable: 'gnomad_v4_cnv_track_callable_coverage',
  },
}

// ================================================================================================
// Base query
// ================================================================================================

const fetchTrackCallableCoverage = async (esClient: any, { regions }: any) => {
  const requestBody = {
    query: {
      bool: {
        filter: [
          {
            bool: {
              should: regions.map(({ xstart, xstop }: any) => ({
                range: { xpos: { gte: xstart, lte: xstop } },
              })),
            },
          },
        ],
      },
    },
  }

  const response = await esClient.search({
    index: 'gnomad_v4_cnv_track_callable_coverage',
    type: '_doc',
    size: 2,
    body: requestBody,
  })
  return response.body.hits.hits.map((hit: any) => ({
    xpos: parseFloat(hit._source.xpos),
    percent_callable: Math.ceil((hit._source.percent_callable || 0) * 100) / 100,
  }))
}

// ================================================================================================
// Region queries
// ================================================================================================

export const fetchTrackCallableCoverageForRegion = (esClient: any, datasetId: any, region: any) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, region.reference_genome)

  if (!datasetId.startsWith('gnomad_cnv_')) {
    throw new UserVisibleError('Track callabe coverage is not available for non-CNVs')
  }

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const trackCallableCoverageIndex = COVERAGE_INDICES[datasetId]

  const regionSize = region.stop - region.start + 150
  const bucketSize = Math.max(Math.floor(regionSize / 500), 1)

  return fetchTrackCallableCoverage(esClient, {
    index: trackCallableCoverageIndex,
    regions: [{ start: region.start - 75, stop: region.stop + 75 }],
    bucketSize,
  })
}

// ================================================================================================
// Gene query
// ================================================================================================

export const _fetchTrackCallableCoverageForGene = async (
  esClient: any,
  datasetId: any,
  gene: any
) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, gene.reference_genome)

  if (!datasetId.startsWith('gnomad_cnv_')) {
    throw new UserVisibleError('Track callabe coverage is not available for non-CNVs')
  }

  const paddedExons = extendRegions(75, gene.exons)

  const mergedExons = mergeOverlappingRegions(
    paddedExons.sort((a: any, b: any) => a.start - b.start)
  )

  const totalIntervalSize = totalRegionSize(mergedExons)
  const bucketSize = Math.max(Math.floor(totalIntervalSize / 500), 1)

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const trackCallableCoverageIndex = COVERAGE_INDICES[datasetId]
  const trackCallableCoverage = await fetchTrackCallableCoverage(esClient, {
    index: trackCallableCoverageIndex,
    regions: mergedExons,
    bucketSize,
  })

  return {
    cnv_track_callable_coverage: trackCallableCoverage || [],
  }
}

export const fetchTrackCallableCoverageForGene = _fetchTrackCallableCoverageForGene
