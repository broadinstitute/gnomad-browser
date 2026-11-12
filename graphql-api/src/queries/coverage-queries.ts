import type { CoverageHistogram, CoverageStore } from '@gnomad/data-store'

import { withCache } from '../cache'
import { UserVisibleError } from '../errors'
import { resolveParquetOnlyStub } from '../parquet-only-stubs'

import { extendRegions, mergeOverlappingRegions, totalRegionSize } from './helpers/region-helpers'

import { assertDatasetAndReferenceGenomeMatch } from './helpers/validation-helpers'

const COVERAGE_INDICES = {
  gnomad_r4: {
    exome: 'gnomad_v4_exome_coverage',
    genome: 'gnomad_v3_genome_coverage',
  },
  gnomad_cnv_r4: {
    exome: 'gnomad_v4_exome_coverage',
    genome: null,
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

const COVERAGE_OVER_X_FIELDS = [
  'over_1',
  'over_5',
  'over_10',
  'over_15',
  'over_20',
  'over_25',
  'over_30',
  'over_50',
  'over_100',
] as const

type CoverageAverages = Record<
  'mean' | 'median' | (typeof COVERAGE_OVER_X_FIELDS)[number],
  number | null | undefined
>

const shapeCoverageBin = (pos: number, averages: CoverageAverages) => ({
  pos,
  mean: averages.mean || 0,
  median: averages.median || 0,
  over_x: COVERAGE_OVER_X_FIELDS.map((field) => Math.ceil((averages[field] || 0) * 100) / 100),
})

const prepareExonCoverageQuery = (exons: any) => {
  const paddedExons = extendRegions(75, exons)
  const mergedExons = mergeOverlappingRegions(
    paddedExons.sort((a: any, b: any) => a.start - b.start)
  )
  const bucketSize = Math.max(Math.floor(totalRegionSize(mergedExons) / 500), 1)
  return { mergedExons, bucketSize }
}

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

    return response.body.aggregations.coverage.buckets.map((bucket: any) =>
      shapeCoverageBin(bucket.key, {
        mean: bucket.mean.value,
        median: bucket.median.value,
        over_1: bucket.over_1.value,
        over_5: bucket.over_5.value,
        over_10: bucket.over_10.value,
        over_15: bucket.over_15.value,
        over_20: bucket.over_20.value,
        over_25: bucket.over_25.value,
        over_30: bucket.over_30.value,
        over_50: bucket.over_50.value,
        over_100: bucket.over_100.value,
      })
    )
  } catch (error) {
    if (error instanceof UserVisibleError) {
      throw error
    }
    throw new Error(`Couldn't fetch coverage, ${error}`)
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

  const { mergedExons, bucketSize } = prepareExonCoverageQuery(gene.exons)

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const exomeCoverageIndex = COVERAGE_INDICES[datasetId].exome
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const genomeCoverageIndex = COVERAGE_INDICES[datasetId].genome

  const exomeCoveragePromise = exomeCoverageIndex
    ? fetchCoverage(esClient, {
        index: exomeCoverageIndex,
        contig: gene.reference_genome === 'GRCh38' ? `chr${gene.chrom}` : gene.chrom,
        regions: mergedExons,
        bucketSize,
      })
    : []
  const genomeCoveragePromise = genomeCoverageIndex
    ? fetchCoverage(esClient, {
        index: genomeCoverageIndex,
        contig: gene.reference_genome === 'GRCh38' ? `chr${gene.chrom}` : gene.chrom,
        regions: mergedExons,
        bucketSize,
      })
    : []

  const [exomeCoverage, genomeCoverage] = await Promise.all([
    exomeCoveragePromise,
    genomeCoveragePromise,
  ])

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

export const PARQUET_EXOME_COVERAGE_DATASETS: ReadonlySet<string> = new Set([
  'gnomad_r4',
  'gnomad_cnv_r4',
])

const EMPTY_COVERAGE_AVERAGES: CoverageAverages = {
  mean: null,
  median: null,
  over_1: null,
  over_5: null,
  over_10: null,
  over_15: null,
  over_20: null,
  over_25: null,
  over_30: null,
  over_50: null,
  over_100: null,
}

// Elasticsearch histograms also return the empty buckets between the first and last bucket, which
// the browser draws as zero coverage. Improvement point: their count scales with the gene's span,
// not its exons (ENST00000648276 needs ~67k buckets), so fill only within the padded exons once the
// coverage track draws the gaps between intervals itself.
const fillEmptyCoverageBuckets = ({ bucket_size: bucketSize, buckets }: CoverageHistogram) => {
  const bins: ReturnType<typeof shapeCoverageBin>[] = []
  buckets.forEach((bucket) => {
    const previousBin = bins[bins.length - 1]
    if (previousBin) {
      for (let pos = previousBin.pos + bucketSize; pos < bucket.bucket_start; pos += bucketSize) {
        bins.push(shapeCoverageBin(pos, EMPTY_COVERAGE_AVERAGES))
      }
    }
    bins.push(shapeCoverageBin(bucket.bucket_start, bucket))
  })
  return bins
}

const fetchGenomeCoverageForGene = (
  esClient: any,
  datasetId: string,
  gene: any,
  { isParquetOnly }: { isParquetOnly: boolean }
) => {
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const genomeCoverageIndex = COVERAGE_INDICES[datasetId].genome
  if (!genomeCoverageIndex) {
    return []
  }
  if (isParquetOnly) {
    return resolveParquetOnlyStub('GeneCoverage.genome')
  }

  const { mergedExons, bucketSize } = prepareExonCoverageQuery(gene.exons)
  return fetchCoverage(esClient, {
    index: genomeCoverageIndex,
    contig: `chr${gene.chrom}`,
    regions: mergedExons,
    bucketSize,
  })
}

export const fetchCoverageForGeneFromParquet = async (
  esClient: any,
  exomeCoverageStore: CoverageStore,
  datasetId: string,
  gene: any,
  { isParquetOnly }: { isParquetOnly: boolean }
) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, gene.reference_genome)

  const exons = gene.exons.map(({ start, stop }: any) => ({ start, stop }))
  const exomeCoveragePromise = exomeCoverageStore
    .fetchCoverageInGene(gene.gene_id, gene.chrom, exons)
    .then(fillEmptyCoverageBuckets)

  const genomeCoveragePromise = fetchGenomeCoverageForGene(esClient, datasetId, gene, {
    isParquetOnly,
  })

  const [exomeCoverage, genomeCoverage] = await Promise.all([
    exomeCoveragePromise,
    genomeCoveragePromise,
  ])

  return {
    exome: exomeCoverage,
    genome: genomeCoverage,
  }
}

// ================================================================================================
// Transcript query
// ================================================================================================

const _fetchCoverageForTranscript = async (esClient: any, datasetId: any, transcript: any) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, transcript.reference_genome)

  if (datasetId.startsWith('gnomad_r2_1_') || datasetId.startsWith('gnomad_r3_')) {
    throw new UserVisibleError('Coverage is not available for subsets')
  }

  const { mergedExons, bucketSize } = prepareExonCoverageQuery(transcript.exons)

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const exomeCoverageIndex = COVERAGE_INDICES[datasetId].exome
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const genomeCoverageIndex = COVERAGE_INDICES[datasetId].genome

  const exomeCoveragePromise = exomeCoverageIndex
    ? fetchCoverage(esClient, {
        index: exomeCoverageIndex,
        contig:
          transcript.reference_genome === 'GRCh38' ? `chr${transcript.chrom}` : transcript.chrom,
        regions: mergedExons,
        bucketSize,
      })
    : []
  const genomeCoveragePromise = genomeCoverageIndex
    ? fetchCoverage(esClient, {
        index: genomeCoverageIndex,
        contig:
          transcript.reference_genome === 'GRCh38' ? `chr${transcript.chrom}` : transcript.chrom,
        regions: mergedExons,
        bucketSize,
      })
    : []

  const [exomeCoverage, genomeCoverage] = await Promise.all([
    exomeCoveragePromise,
    genomeCoveragePromise,
  ])

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
