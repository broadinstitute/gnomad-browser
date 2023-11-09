import { withCache } from '../cache'
import { DATASET_LABELS } from '../datasets'
import { UserVisibleError } from '../errors'

import { extendRegions, mergeOverlappingRegions, totalRegionSize } from './helpers/region-helpers'

import { assertDatasetAndReferenceGenomeMatch } from './helpers/validation-helpers'

const COVERAGE_INDICES = {
  gnomad_r4: 'gnomad_v3_mitochondrial_coverage',
  gnomad_r3: 'gnomad_v3_mitochondrial_coverage',
}

// ================================================================================================
// Base query
// ================================================================================================

const fetchMitochondrialGenomeCoverage = async (
  esClient: any,
  { index, regions, bucketSize }: any
) => {
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
                  range: { 'locus.position': { gte: start, lte: stop } },
                })),
              },
            },
          ],
        },
      },
      aggregations: {
        coverage: {
          histogram: {
            field: 'locus.position',
            interval: bucketSize,
          },
          aggregations: {
            mean: { avg: { field: 'mean' } },
            median: { avg: { field: 'median' } },
            over_100: { avg: { field: 'over_100' } },
            over_1000: { avg: { field: 'over_1000' } },
          },
        },
      },
    },
  })

  return response.body.aggregations.coverage.buckets.map((bucket: any) => ({
    pos: bucket.key,
    mean: bucket.mean.value || 0,
    median: bucket.median.value || 0,

    over_x: [
      // Round values
      Math.ceil((bucket.over_100.value || 0) * 100) / 100,
      Math.ceil((bucket.over_1000.value || 0) * 100) / 100,
    ],
  }))
}

// ================================================================================================
// Gene query
// ================================================================================================

const _fetchMitochondrialGenomeCoverageForGene = async (
  esClient: any,
  datasetId: any,
  gene: any
) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, gene.reference_genome)

  if (gene.chrom !== 'M') {
    throw new UserVisibleError(
      'Mitochondrial genome coverage is only available for mitochondrial genes'
    )
  }

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const coverageIndex = COVERAGE_INDICES[datasetId]

  if (!coverageIndex) {
    throw new UserVisibleError(
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      `Mitochondrial genome coverage is not available for ${DATASET_LABELS[datasetId]}`
    )
  }

  const paddedExons = extendRegions(75, gene.exons)
  const mergedExons = mergeOverlappingRegions(
    paddedExons.sort((a: any, b: any) => a.start - b.start)
  )
  const totalIntervalSize = totalRegionSize(mergedExons)
  const bucketSize = Math.max(Math.floor(totalIntervalSize / 500), 1)

  return fetchMitochondrialGenomeCoverage(esClient, {
    index: coverageIndex,
    regions: mergedExons,
    bucketSize,
  })
}
export const fetchMitochondrialGenomeCoverageForGene = withCache(
  _fetchMitochondrialGenomeCoverageForGene,
  (_: any, datasetId: any, gene: any) => `mt_coverage:${datasetId}:gene:${gene.gene_id}`,
  { expiration: 86400 }
)

// ================================================================================================
// Region queries
// ================================================================================================

export const fetchMitochondrialGenomeCoverageForRegion = (
  esClient: any,
  datasetId: any,
  region: any
) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, region.reference_genome)

  if (region.chrom !== 'M') {
    throw new UserVisibleError(
      'Mitochondrial genome coverage is only available for mitochondrial regions'
    )
  }

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const coverageIndex = COVERAGE_INDICES[datasetId]

  if (!coverageIndex) {
    throw new UserVisibleError(
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      `Mitochondrial genome coverage is not available for ${DATASET_LABELS[datasetId]}`
    )
  }

  const regionSize = region.stop - region.start + 150
  const bucketSize = Math.max(Math.floor(regionSize / 500), 1)

  return fetchMitochondrialGenomeCoverage(esClient, {
    index: coverageIndex,
    regions: [{ start: region.start - 75, stop: region.stop + 75 }],
    bucketSize,
  })
}

// ================================================================================================
// Transcript query
// ================================================================================================

export const fetchMitochondrialGenomeCoverageForTranscript = (
  esClient: any,
  datasetId: any,
  transcript: any
) => {
  // Mitochondrial genes only have one transcript, so gene and transcript queries are equivalent.
  return _fetchMitochondrialGenomeCoverageForGene(esClient, datasetId, transcript.gene)
}
