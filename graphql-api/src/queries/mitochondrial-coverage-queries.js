const { withCache } = require('../cache')
const { DATASET_LABELS } = require('../datasets')
const { UserVisibleError } = require('../errors')

const {
  extendRegions,
  mergeOverlappingRegions,
  totalRegionSize,
} = require('./helpers/region-helpers')

const { assertDatasetAndReferenceGenomeMatch } = require('./helpers/validation-helpers')

const COVERAGE_INDICES = {
  gnomad_r3: 'gnomad_v3_mitochondrial_coverage',
}

// ================================================================================================
// Base query
// ================================================================================================

const fetchMitochondrialGenomeCoverage = async (esClient, { index, regions, bucketSize }) => {
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
                should: regions.map(({ start, stop }) => ({
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

  return response.body.aggregations.coverage.buckets.map((bucket) => ({
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

const fetchMitochondrialGenomeCoverageForGene = async (esClient, datasetId, gene) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, gene.reference_genome)

  if (gene.chrom !== 'M') {
    throw new UserVisibleError(
      'Mitochondrial genome coverage is only available for mitochondrial genes'
    )
  }

  const coverageIndex = COVERAGE_INDICES[datasetId]

  if (!coverageIndex) {
    throw new UserVisibleError(
      `Mitochondrial genome coverage is not available for ${DATASET_LABELS[datasetId]}`
    )
  }

  const paddedExons = extendRegions(75, gene.exons)
  const mergedExons = mergeOverlappingRegions(paddedExons.sort((a, b) => a.start - b.start))
  const totalIntervalSize = totalRegionSize(mergedExons)
  const bucketSize = Math.max(Math.floor(totalIntervalSize / 500), 1)

  return fetchMitochondrialGenomeCoverage(esClient, {
    index: coverageIndex,
    regions: mergedExons,
    bucketSize,
  })
}

// ================================================================================================
// Region queries
// ================================================================================================

const fetchMitochondrialGenomeCoverageForRegion = (esClient, datasetId, region) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, region.reference_genome)

  if (region.chrom !== 'M') {
    throw new UserVisibleError(
      'Mitochondrial genome coverage is only available for mitochondrial regions'
    )
  }

  const coverageIndex = COVERAGE_INDICES[datasetId]

  if (!coverageIndex) {
    throw new UserVisibleError(
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

const fetchMitochondrialGenomeCoverageForTranscript = (esClient, datasetId, transcript) => {
  // Mitochondrial genes only have one transcript, so gene and transcript queries are equivalent.
  return fetchMitochondrialGenomeCoverageForGene(esClient, datasetId, transcript.gene)
}

module.exports = {
  fetchMitochondrialGenomeCoverageForRegion,
  fetchMitochondrialGenomeCoverageForGene: withCache(
    fetchMitochondrialGenomeCoverageForGene,
    (_, datasetId, gene) => `mt_coverage:${datasetId}:gene:${gene.gene_id}`,
    { expiration: 86400 }
  ),
  fetchMitochondrialGenomeCoverageForTranscript,
}
