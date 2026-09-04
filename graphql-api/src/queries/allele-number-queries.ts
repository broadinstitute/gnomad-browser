import { withCache } from '../cache'
import { DATASET_LABELS } from '../datasets'
import { UserVisibleError } from '../errors'
import logger from '../logger'

import { extendRegions, mergeOverlappingRegions, totalRegionSize } from './helpers/region-helpers'

import { assertDatasetAndReferenceGenomeMatch } from './helpers/validation-helpers'

/**
 * Datasets with an all-sites allele number release.
 *
 * Both indices are genuinely v4.1, unlike coverage, where gnomAD v4 still reads
 * its genome series from the v3.0.1 index.
 *
 * This is an allowlist rather than a "reject subsets" check. Subsets, older
 * releases and the SV/CNV datasets all lack an allele number release, and an
 * allowlist cannot quietly admit a new one -- a v4 subset would otherwise pass
 * a `gnomad_r2_1_`/`gnomad_r3_` prefix check and be served the full callset's
 * allele number, which is not the same number at all.
 */
const ALLELE_NUMBER_INDICES: { [datasetId: string]: { exome: string; genome: string } } = {
  gnomad_r4: {
    exome: 'gnomad_v4_exome_allele_number',
    genome: 'gnomad_v4_genome_allele_number',
  },
}

const assertAlleleNumberAvailable = (datasetId: string) => {
  if (!(datasetId in ALLELE_NUMBER_INDICES)) {
    // @ts-expect-error TS(7053) DATASET_LABELS is a literal object, not a Record.
    throw new UserVisibleError(`Allele number is not available for ${DATASET_LABELS[datasetId]}`)
  }
}

// GRCh38 indices use chr-prefixed contig names, GRCh37 indices do not.
const contigForFeature = ({ chrom, reference_genome: referenceGenome }: any) =>
  referenceGenome === 'GRCh38' ? `chr${chrom}` : chrom

/**
 * True for the error Elasticsearch raises when an index does not exist.
 *
 * The allele number indices are loaded by a pipeline run of their own, so an
 * API deployed ahead of that load will see this. Matching on the exception type
 * rather than on a 404 status keeps unrelated not-found responses out.
 */
const isIndexNotFoundError = (error: any) =>
  (error?.meta?.body ?? error?.body)?.error?.type === 'index_not_found_exception'

/**
 * Run `fetch`, reporting a missing Elasticsearch index as "no data".
 *
 * A missing index means the pipeline has not been loaded yet. That is a
 * transient operational state, not a bad request, and the browser handles it by
 * hiding the call rate metric -- much better than failing the whole page.
 *
 * This deliberately wraps the *cached* function rather than sitting inside it.
 * An empty result produced by an unloaded index must never reach the cache:
 * cache entries have their expiration refreshed on every read, so an empty
 * result cached for a popular gene would outlive the pipeline run that fixes it.
 */
const emptyIfIndexNotFound = async (empty: any, fetch: () => Promise<any>) => {
  try {
    return await fetch()
  } catch (error) {
    if (isIndexNotFoundError(error)) {
      logger.warn(`Allele number index not loaded, serving no allele number data (${error})`)
      return empty
    }
    throw error
  }
}

// ================================================================================================
// Base query
// ================================================================================================

const fetchAlleleNumber = async (esClient: any, { index, contig, regions, bucketSize }: any) => {
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
    // Nulls are preserved rather than coerced to 0 the way the coverage query
    // does. A bucket that covers no indexed base is not a bucket where nobody
    // was called, and plotting it as zero would draw a callability cliff that
    // is not in the data.
    //
    // Allele number is a count of alleles, so the average over a bucket is
    // rounded back to a whole number.
    an: bucket.an.value === null ? null : Math.round(bucket.an.value),
    an_percent:
      bucket.an_percent.value === null ? null : Math.round(bucket.an_percent.value * 1000) / 1000,
  }))
}

// ================================================================================================
// Region queries
// ================================================================================================

const fetchAlleleNumberForRegion = (
  esClient: any,
  datasetId: any,
  region: any,
  dataType: 'exome' | 'genome'
) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, region.reference_genome)
  assertAlleleNumberAvailable(datasetId)

  // The +150 accounts for the 75 bases of padding added at each end below.
  const regionSize = region.stop - region.start + 150
  const bucketSize = Math.max(Math.floor(regionSize / 500), 1)

  return fetchAlleleNumber(esClient, {
    index: ALLELE_NUMBER_INDICES[datasetId][dataType],
    contig: contigForFeature(region),
    regions: [{ start: region.start - 75, stop: region.stop + 75 }],
    bucketSize,
  })
}

// Regions are not cached, matching the region coverage queries.
export const fetchExomeAlleleNumberForRegion = (esClient: any, datasetId: any, region: any) =>
  emptyIfIndexNotFound([], () => fetchAlleleNumberForRegion(esClient, datasetId, region, 'exome'))

export const fetchGenomeAlleleNumberForRegion = (esClient: any, datasetId: any, region: any) =>
  emptyIfIndexNotFound([], () => fetchAlleleNumberForRegion(esClient, datasetId, region, 'genome'))

// ================================================================================================
// Gene and transcript queries
// ================================================================================================

/**
 * Allele number over the exons of a gene or transcript.
 *
 * The padding, merging and bucket sizing are the same as the coverage query for
 * the same feature, so the two metrics bin to the same positions and a reader
 * can compare them bucket for bucket.
 */
const fetchAlleleNumberForExons = async (esClient: any, datasetId: any, feature: any) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, feature.reference_genome)
  assertAlleleNumberAvailable(datasetId)

  const paddedExons = extendRegions(75, feature.exons)
  const mergedExons = mergeOverlappingRegions(
    paddedExons.sort((a: any, b: any) => a.start - b.start)
  )
  const totalIntervalSize = totalRegionSize(mergedExons)
  const bucketSize = Math.max(Math.floor(totalIntervalSize / 500), 1)

  const indices = ALLELE_NUMBER_INDICES[datasetId]
  const query = { contig: contigForFeature(feature), regions: mergedExons, bucketSize }

  const [exome, genome] = await Promise.all([
    fetchAlleleNumber(esClient, { ...query, index: indices.exome }),
    fetchAlleleNumber(esClient, { ...query, index: indices.genome }),
  ])

  return { exome, genome }
}

const cachedAlleleNumberForGene = withCache(
  fetchAlleleNumberForExons,
  (_: any, datasetId: any, gene: any) => `allele_number:${datasetId}:gene:${gene.gene_id}`,
  { expiration: 604800 }
)

const cachedAlleleNumberForTranscript = withCache(
  fetchAlleleNumberForExons,
  (_: any, datasetId: any, transcript: any) =>
    `allele_number:${datasetId}:transcript:${transcript.transcript_id}`,
  { expiration: 3600 }
)

export const fetchAlleleNumberForGene = (esClient: any, datasetId: any, gene: any) =>
  emptyIfIndexNotFound({ exome: [], genome: [] }, () =>
    cachedAlleleNumberForGene(esClient, datasetId, gene)
  )

export const fetchAlleleNumberForTranscript = (esClient: any, datasetId: any, transcript: any) =>
  emptyIfIndexNotFound({ exome: [], genome: [] }, () =>
    cachedAlleleNumberForTranscript(esClient, datasetId, transcript)
  )
