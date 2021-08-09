const { withCache } = require('../cache')
const { UserVisibleError } = require('../errors')

const {
  extendRegions,
  mergeOverlappingRegions,
  totalRegionSize,
} = require('./helpers/region-helpers')

const { assertDatasetAndReferenceGenomeMatch } = require('./helpers/validation-helpers')

const COVERAGE_INDICES = {
  gnomad_r3: {
    exome: null,
    genome: 'gnomad_v3_genome_coverage',
  },
  gnomad_r2_1: {
    exome: 'gnomad_v2_exome_coverage',
    genome: 'gnomad_v2_genome_coverage',
  },
  gnomad_sv_r2_1: {
    exome: null,
    genome: 'gnomad_sv_v2_genome_coverage',
  },
  exac: {
    exome: 'exac_exome_coverage',
    genome: null,
  },
}

// ================================================================================================
// Base query
// ================================================================================================

const fetchCoverage = async (esClient, { index, contig, regions, bucketSize }) => {
  const response = await esClient.search({
    index,
    type: '_doc',
    size: 0,
    body: {
      query: {
        bool: {
          filter: [
            { term: { 'locus.contig': contig } },
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
            over_1: { avg: { field: 'over_1' } },
            over_5: { avg: { field: 'over_5' } },
            over_10: { avg: { field: 'over_10' } },
            over_15: { avg: { field: 'over_15' } },
            over_20: { avg: { field: 'over_20' } },
            over_25: { avg: { field: 'over_25' } },
            over_30: { avg: { field: 'over_30' } },
            over_50: { avg: { field: 'over_50' } },
            over_100: { avg: { field: 'over_100' } },
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
      Math.ceil((bucket.over_1.value || 0) * 100) / 100,
      Math.ceil((bucket.over_5.value || 0) * 100) / 100,
      Math.ceil((bucket.over_10.value || 0) * 100) / 100,
      Math.ceil((bucket.over_15.value || 0) * 100) / 100,
      Math.ceil((bucket.over_20.value || 0) * 100) / 100,
      Math.ceil((bucket.over_25.value || 0) * 100) / 100,
      Math.ceil((bucket.over_30.value || 0) * 100) / 100,
      Math.ceil((bucket.over_50.value || 0) * 100) / 100,
      Math.ceil((bucket.over_100.value || 0) * 100) / 100,
    ],
  }))
}

// ================================================================================================
// Region queries
// ================================================================================================

const fetchExomeCoverageForRegion = (esClient, datasetId, region) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, region.reference_genome)

  if (datasetId.startsWith('gnomad_r2_1_') || datasetId.startsWith('gnomad_r3_')) {
    throw new UserVisibleError('Coverage is not available for subsets')
  }

  const exomeCoverageIndex = COVERAGE_INDICES[datasetId].exome

  const regionSize = region.stop - region.start + 150
  const bucketSize = Math.max(Math.floor(regionSize / 500), 1)

  return exomeCoverageIndex
    ? fetchCoverage(esClient, {
        index: exomeCoverageIndex,
        contig: region.reference_genome === 'GRCh38' ? `chr${region.chrom}` : region.chrom,
        regions: [{ start: region.start - 75, stop: region.stop + 75 }],
        bucketSize,
      })
    : []
}

const fetchGenomeCoverageForRegion = (esClient, datasetId, region) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, region.reference_genome)

  if (datasetId.startsWith('gnomad_r2_1_') || datasetId.startsWith('gnomad_r3_')) {
    throw new UserVisibleError('Coverage is not available for subsets')
  }

  const genomeCoverageIndex = COVERAGE_INDICES[datasetId].genome

  const regionSize = region.stop - region.start + 150
  const bucketSize = Math.max(Math.floor(regionSize / 500), 1)

  return genomeCoverageIndex
    ? fetchCoverage(esClient, {
        index: genomeCoverageIndex,
        contig: region.reference_genome === 'GRCh38' ? `chr${region.chrom}` : region.chrom,
        regions: [{ start: region.start - 75, stop: region.stop + 75 }],
        bucketSize,
      })
    : []
}

// ================================================================================================
// Gene query
// ================================================================================================

const fetchCoverageForGene = async (esClient, datasetId, gene) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, gene.reference_genome)

  if (datasetId.startsWith('gnomad_r2_1_') || datasetId.startsWith('gnomad_r3_')) {
    throw new UserVisibleError('Coverage is not available for subsets')
  }

  const paddedExons = extendRegions(75, gene.exons)
  const mergedExons = mergeOverlappingRegions(paddedExons.sort((a, b) => a.start - b.start))
  const totalIntervalSize = totalRegionSize(mergedExons)
  const bucketSize = Math.max(Math.floor(totalIntervalSize / 500), 1)

  const exomeCoverageIndex = COVERAGE_INDICES[datasetId].exome
  const genomeCoverageIndex = COVERAGE_INDICES[datasetId].genome

  const exomeCoverage = exomeCoverageIndex
    ? await fetchCoverage(esClient, {
        index: exomeCoverageIndex,
        contig: gene.reference_genome === 'GRCh38' ? `chr${gene.chrom}` : gene.chrom,
        regions: mergedExons,
        bucketSize,
      })
    : []

  const genomeCoverage = genomeCoverageIndex
    ? await fetchCoverage(esClient, {
        index: genomeCoverageIndex,
        contig: gene.reference_genome === 'GRCh38' ? `chr${gene.chrom}` : gene.chrom,
        regions: mergedExons,
        bucketSize,
      })
    : []

  return {
    exome: exomeCoverage,
    genome: genomeCoverage,
  }
}

// ================================================================================================
// Transcript query
// ================================================================================================

const fetchCoverageForTranscript = async (esClient, datasetId, transcript) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, transcript.reference_genome)

  if (datasetId.startsWith('gnomad_r2_1_') || datasetId.startsWith('gnomad_r3_')) {
    throw new UserVisibleError('Coverage is not available for subsets')
  }

  const paddedExons = extendRegions(75, transcript.exons)
  const mergedExons = mergeOverlappingRegions(paddedExons.sort((a, b) => a.start - b.start))
  const totalIntervalSize = totalRegionSize(mergedExons)
  const bucketSize = Math.max(Math.floor(totalIntervalSize / 500), 1)

  const exomeCoverageIndex = COVERAGE_INDICES[datasetId].exome
  const genomeCoverageIndex = COVERAGE_INDICES[datasetId].genome

  const exomeCoverage = exomeCoverageIndex
    ? await fetchCoverage(esClient, {
        index: exomeCoverageIndex,
        contig:
          transcript.reference_genome === 'GRCh38' ? `chr${transcript.chrom}` : transcript.chrom,
        regions: mergedExons,
        bucketSize,
      })
    : []

  const genomeCoverage = genomeCoverageIndex
    ? await fetchCoverage(esClient, {
        index: genomeCoverageIndex,
        contig:
          transcript.reference_genome === 'GRCh38' ? `chr${transcript.chrom}` : transcript.chrom,
        regions: mergedExons,
        bucketSize,
      })
    : []

  return {
    exome: exomeCoverage,
    genome: genomeCoverage,
  }
}

module.exports = {
  fetchExomeCoverageForRegion,
  fetchGenomeCoverageForRegion,
  fetchCoverageForGene: withCache(
    fetchCoverageForGene,
    (_, datasetId, gene) => `coverage:${datasetId}:gene:${gene.gene_id}`,
    { expiration: 604800 }
  ),
  fetchCoverageForTranscript: withCache(
    fetchCoverageForTranscript,
    (_, datasetId, transcript) => `coverage:${datasetId}:transcript:${transcript.transcript_id}`,
    { expiration: 3600 }
  ),
}
