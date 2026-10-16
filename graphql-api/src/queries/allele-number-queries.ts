import { withCache } from '../cache'
import { UserVisibleError } from '../errors'

import { extendRegions, mergeOverlappingRegions, totalRegionSize } from './helpers/region-helpers'

import { assertDatasetAndReferenceGenomeMatch } from './helpers/validation-helpers'

// Allele number is published for v4.1 exomes and v4.1 genomes. Note the genome
// index is genuinely v4.1, unlike genome coverage, which v4 inherits from v3.0.1.
// Datasets absent from this map have no AN track; the browser hides the metrics
// rather than drawing an empty series.
const ALLELE_NUMBER_INDICES = {
  gnomad_r4: {
    exome: 'gnomad_v4_exome_allele_number',
    genome: 'gnomad_v4_genome_allele_number',
  },
}

const indicesForDataset = (datasetId: string) =>
  // @ts-expect-error TS(7053) datasetId is a union wider than this map's keys.
  ALLELE_NUMBER_INDICES[datasetId] || { exome: null, genome: null }

// ================================================================================================
// Base query
// ================================================================================================

const fetchAlleleNumber = async (esClient: any, { index, contig, regions, bucketSize }: any) => {
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
          allele_number: {
            histogram: {
              field: 'locus.position',
              interval: bucketSize,
            },
            aggregations: {
              an: { avg: { field: 'an' } },
              an_percent: { avg: { field: 'an_percent' } },
            },
          },
        },
      },
    })

    return response.body.aggregations.allele_number.buckets.map((bucket: any) => ({
      pos: bucket.key,
      // Averaging the per-base percentage rather than recomputing it from summed
      // AN is exact wherever the attainable AN is constant across the bucket,
      // which is everywhere except the three PAR boundaries, and matches how the
      // coverage track already aggregates its over_x fractions.
      an: bucket.an.value === null ? null : Math.round(bucket.an.value),
      an_percent:
        bucket.an_percent.value === null ? null : Math.round(bucket.an_percent.value * 1000) / 1000,
    }))
  } catch (error) {
    throw new Error(`Couldn't fetch allele number, ${error}`)
  }
}

// ================================================================================================
// Region queries
// ================================================================================================

const fetchAlleleNumberForRegion = (
  esClient: any,
  datasetId: any,
  region: any,
  sequencingType: 'exome' | 'genome'
) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, region.reference_genome)

  if (datasetId.startsWith('gnomad_r2_1_') || datasetId.startsWith('gnomad_r3_')) {
    throw new UserVisibleError('Allele number is not available for subsets')
  }

  const index = indicesForDataset(datasetId)[sequencingType]

  const regionSize = region.stop - region.start + 150
  const bucketSize = Math.max(Math.floor(regionSize / 500), 1)

  return index
    ? fetchAlleleNumber(esClient, {
        index,
        contig: region.reference_genome === 'GRCh38' ? `chr${region.chrom}` : region.chrom,
        regions: [{ start: region.start - 75, stop: region.stop + 75 }],
        bucketSize,
      })
    : []
}

export const fetchExomeAlleleNumberForRegion = (esClient: any, datasetId: any, region: any) =>
  fetchAlleleNumberForRegion(esClient, datasetId, region, 'exome')

export const fetchGenomeAlleleNumberForRegion = (esClient: any, datasetId: any, region: any) =>
  fetchAlleleNumberForRegion(esClient, datasetId, region, 'genome')

// ================================================================================================
// Gene query
// ================================================================================================

export const _fetchAlleleNumberForGene = async (esClient: any, datasetId: any, gene: any) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, gene.reference_genome)

  if (datasetId.startsWith('gnomad_r2_1_') || datasetId.startsWith('gnomad_r3_')) {
    throw new UserVisibleError('Allele number is not available for subsets')
  }

  const paddedExons = extendRegions(75, gene.exons)
  const mergedExons = mergeOverlappingRegions(
    paddedExons.sort((a: any, b: any) => a.start - b.start)
  )
  const totalIntervalSize = totalRegionSize(mergedExons)
  const bucketSize = Math.max(Math.floor(totalIntervalSize / 500), 1)

  const { exome: exomeIndex, genome: genomeIndex } = indicesForDataset(datasetId)
  const contig = gene.reference_genome === 'GRCh38' ? `chr${gene.chrom}` : gene.chrom

  const exomeAlleleNumber = exomeIndex
    ? await fetchAlleleNumber(esClient, {
        index: exomeIndex,
        contig,
        regions: mergedExons,
        bucketSize,
      })
    : []

  const genomeAlleleNumber = genomeIndex
    ? await fetchAlleleNumber(esClient, {
        index: genomeIndex,
        contig,
        regions: mergedExons,
        bucketSize,
      })
    : []

  return {
    exome: exomeAlleleNumber,
    genome: genomeAlleleNumber,
  }
}

export const fetchAlleleNumberForGene = withCache(
  _fetchAlleleNumberForGene,
  (_: any, datasetId: any, gene: any) => `allele_number:${datasetId}:gene:${gene.gene_id}`,
  { expiration: 604800 }
)

// ================================================================================================
// Transcript query
// ================================================================================================

export const _fetchAlleleNumberForTranscript = async (
  esClient: any,
  datasetId: any,
  transcript: any
) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, transcript.reference_genome)

  if (datasetId.startsWith('gnomad_r2_1_') || datasetId.startsWith('gnomad_r3_')) {
    throw new UserVisibleError('Allele number is not available for subsets')
  }

  const paddedExons = extendRegions(75, transcript.exons)
  const mergedExons = mergeOverlappingRegions(
    paddedExons.sort((a: any, b: any) => a.start - b.start)
  )
  const totalIntervalSize = totalRegionSize(mergedExons)
  const bucketSize = Math.max(Math.floor(totalIntervalSize / 500), 1)

  const { exome: exomeIndex, genome: genomeIndex } = indicesForDataset(datasetId)
  const contig =
    transcript.reference_genome === 'GRCh38' ? `chr${transcript.chrom}` : transcript.chrom

  const exomeAlleleNumber = exomeIndex
    ? await fetchAlleleNumber(esClient, {
        index: exomeIndex,
        contig,
        regions: mergedExons,
        bucketSize,
      })
    : []

  const genomeAlleleNumber = genomeIndex
    ? await fetchAlleleNumber(esClient, {
        index: genomeIndex,
        contig,
        regions: mergedExons,
        bucketSize,
      })
    : []

  return {
    exome: exomeAlleleNumber,
    genome: genomeAlleleNumber,
  }
}

export const fetchAlleleNumberForTranscript = withCache(
  _fetchAlleleNumberForTranscript,
  (_: any, datasetId: any, transcript: any) =>
    `allele_number:${datasetId}:transcript:${transcript.transcript_id}`,
  { expiration: 604800 }
)
