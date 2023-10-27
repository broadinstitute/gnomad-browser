import { withCache } from '../cache'
import { UserVisibleError } from '../errors'

import { extendRegions, mergeOverlappingRegions, totalRegionSize } from './helpers/region-helpers'

import { assertDatasetAndReferenceGenomeMatch } from './helpers/validation-helpers'

const COVERAGE_INDICES = {
  gnomad_r4: {
    exome: 'gnomad_v4_exome_coverage',
    genome: 'gnomad_v4_genome_coverage',
  },
  gnomad_r3: {
    exome: null,
    genome: 'gnomad_v3_genome_coverage',
  },
  gnomad_r2_1: {
    exome: 'gnomad_v2_exome_coverage',
    genome: 'gnomad_v2_genome_coverage',
  },
  exac: {
    exome: 'exac_exome_coverage',
    genome: null,
  },
}

// ================================================================================================
// Base query
// ================================================================================================

const fetchCoverage = async (esClient: any, { index, contig, regions, bucketSize }: any) => {
  try {
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

    return response.body.aggregations.coverage.buckets.map((bucket: any) => ({
      pos: bucket.key,
      mean: bucket.mean.value || 0,
      median: bucket.median.value || 0,

      over_x: [
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
  } catch (error) {
    console.error("Error fetching coverage:", error);
    throw error;  // Re-throwing the error to be handled by the caller or higher up in the call stack
  }
}
// ================================================================================================
// Region queries
// ================================================================================================

export const fetchExomeCoverageForRegion = (esClient: any, datasetId: any, region: any) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, region.reference_genome)

  if (datasetId.startsWith('gnomad_r2_1_') || datasetId.startsWith('gnomad_r3_')) {
    throw new UserVisibleError('Coverage is not available for subsets')
  }

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
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

export const fetchGenomeCoverageForRegion = (esClient: any, datasetId: any, region: any) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, region.reference_genome)

  if (datasetId.startsWith('gnomad_r2_1_') || datasetId.startsWith('gnomad_r3_')) {
    throw new UserVisibleError('Coverage is not available for subsets')
  }

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
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

export const _fetchCoverageForGene = async (esClient: any, datasetId: any, gene: any) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, gene.reference_genome)

  if (datasetId.startsWith('gnomad_r2_1_') || datasetId.startsWith('gnomad_r3_')) {
    throw new UserVisibleError('Coverage is not available for subsets')
  }

  const paddedExons = extendRegions(75, gene.exons)
  const mergedExons = mergeOverlappingRegions(
    paddedExons.sort((a: any, b: any) => a.start - b.start)
  )
  const totalIntervalSize = totalRegionSize(mergedExons)
  const bucketSize = Math.max(Math.floor(totalIntervalSize / 500), 1)

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const exomeCoverageIndex = COVERAGE_INDICES[datasetId].exome
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
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

export const fetchCoverageForGene = withCache(
  _fetchCoverageForGene,
  (_: any, datasetId: any, gene: any) => `coverage:${datasetId}:gene:${gene.gene_id}`,
  { expiration: 604800 }
)

// ================================================================================================
// Transcript query
// ================================================================================================

const _fetchCoverageForTranscript = async (esClient: any, datasetId: any, transcript: any) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, transcript.reference_genome)

  if (datasetId.startsWith('gnomad_r2_1_') || datasetId.startsWith('gnomad_r3_')) {
    throw new UserVisibleError('Coverage is not available for subsets')
  }

  const paddedExons = extendRegions(75, transcript.exons)
  const mergedExons = mergeOverlappingRegions(
    paddedExons.sort((a: any, b: any) => a.start - b.start)
  )
  const totalIntervalSize = totalRegionSize(mergedExons)
  const bucketSize = Math.max(Math.floor(totalIntervalSize / 500), 1)

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const exomeCoverageIndex = COVERAGE_INDICES[datasetId].exome
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
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

export const fetchCoverageForTranscript = withCache(
  _fetchCoverageForTranscript,
  (_: any, datasetId: any, transcript: any) =>
    `coverage:${datasetId}:transcript:${transcript.transcript_id}`,
  { expiration: 3600 }
)
