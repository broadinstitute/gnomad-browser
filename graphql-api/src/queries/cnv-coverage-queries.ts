import { withCache } from '../cache'
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

const fetchTrackCallableCoverage = async (esClient: any, { index, regions }: any) => {
  try {
    console.log('fetchtrackcallablecoverage')
    const response = await esClient.search({
      index,
      type: '_doc',
      size: 0,
      body: {
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: regions.map(({ start, stop }: any) => ({
                    range: { xpos: { gte: start, lte: stop } },
                  })),
                },
              },
            ],
          },
        },
        aggregations: {
          chart: {
            terms: {
              field: 'xpos',
              interval: 10000,
            },
            aggregations: {
              percent_callable: { avg: { field: 'percent_callable' } },
            },
          },
        },
      },
    })

    return response.body.aggregations.chart.buckets.map((bucket: any) => ({
      pos: bucket.key,
      percent_callable: [Math.ceil((bucket.percent_callable.value || 0) * 100) / 100],
    }))
  } catch (error) {
    console.error('Error fetching coverage:', error)
    throw error
  }
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
    //contig: `chr${region.chrom}` ,
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
  console.log('fetch gene')

  if (!datasetId.startsWith('gnomad_cnv_')) {
    throw new UserVisibleError('Track callabe coverage is not available for non-CNVs')
  }

  const paddedExons = extendRegions(75, gene.exons)
  console.log(paddedExons, 'paddedexons')
  const mergedExons = mergeOverlappingRegions(
    paddedExons.sort((a: any, b: any) => a.start - b.start)
  )
  console.log(mergedExons, 'mergedExons')

  const totalIntervalSize = totalRegionSize(mergedExons)
  const bucketSize = Math.max(Math.floor(totalIntervalSize / 500), 1)

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const trackCallableCoverageIndex = COVERAGE_INDICES[datasetId]
  console.log(trackCallableCoverageIndex, 'trackCallableCoverageIndex')

  const trackCallableCoverage = await fetchTrackCallableCoverage(esClient, {
    index: trackCallableCoverageIndex,
    //  contig: `chr${gene.chrom}`,
    regions: mergedExons,
    bucketSize,
  })
  console.log(trackCallableCoverage, 'trackCallableCoverage')

  return {
    track_callable: trackCallableCoverage,
  }
}
export const fetchTrackCallableCoverageForGene = 
  _fetchTrackCallableCoverageForGene

