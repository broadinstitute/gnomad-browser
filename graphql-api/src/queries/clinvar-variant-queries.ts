import { omit, throttle } from 'lodash'

import { withCache } from '../cache'
import logger from '../logger'

import { fetchAllSearchResults, fetchIndexMetadata } from './helpers/elasticsearch-helpers'
import { mergeOverlappingRegions } from './helpers/region-helpers'
import { getConsequenceForContext } from './variant-datasets/shared/transcriptConsequence'
import largeGenes from './helpers/large-genes'

const CLINVAR_VARIANT_INDICES = {
  GRCh37: 'clinvar_grch37_variants',
  GRCh38: 'clinvar_grch38_variants',
}

// ================================================================================================
// Release date query
// ================================================================================================

const _fetchClinvarReleaseDate = async (esClient: any) => {
  const metadata = await Promise.all([
    fetchIndexMetadata(esClient, CLINVAR_VARIANT_INDICES.GRCh37),
    fetchIndexMetadata(esClient, CLINVAR_VARIANT_INDICES.GRCh38),
  ])

  const releaseDates = metadata.map((m) => m.table_globals.clinvar_release_date)

  if (releaseDates[0] !== releaseDates[1]) {
    logger.error({ message: 'ClinVar release dates do not match' })
  }

  return releaseDates[0]
}

export const fetchClinvarReleaseDate = throttle(_fetchClinvarReleaseDate, 300000)

// ================================================================================================
// Count query
// ================================================================================================

export const countClinvarVariantsInRegion = async (
  esClient: any,
  referenceGenome: any,
  region: any
) => {
  const response = await esClient.count({
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    index: CLINVAR_VARIANT_INDICES[referenceGenome],
    type: '_doc',
    body: {
      query: {
        bool: {
          filter: [
            { term: { chrom: region.chrom } },
            {
              range: {
                pos: {
                  gte: region.start,
                  lte: region.stop,
                },
              },
            },
          ],
        },
      },
    },
  })

  return response.body.count
}

// ================================================================================================
// Variant query
// ================================================================================================

export const fetchClinvarVariantById = async (
  esClient: any,
  referenceGenome: any,
  variantId: any
) => {
  const response = await esClient.search({
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    index: CLINVAR_VARIANT_INDICES[referenceGenome],
    type: '_doc',
    body: {
      query: {
        bool: {
          filter: { term: { variant_id: variantId } },
        },
      },
    },
    size: 1,
  })

  if (response.body.hits.total.value === 0) {
    return null
  }

  const variant = response.body.hits.hits[0]._source.value

  return variant
}

export const fetchClinvarVariantByClinvarVariationId = async (
  esClient: any,
  referenceGenome: any,
  clinvarVariationID: any
) => {
  try {
    const response = await esClient.get({
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      index: CLINVAR_VARIANT_INDICES[referenceGenome],
      type: '_doc',
      id: clinvarVariationID,
    })

    return response.body._source.value
  } catch (err) {
    // meta will not be present if the request times out in the queue before reaching ES
    // @ts-expect-error TS(2571) FIXME: Object is of type 'unknown'.
    if (err.meta && err.meta.body.found === false) {
      return null
    }
    throw err
  }
}

// ================================================================================================
// Shape variant summary
// ================================================================================================

const SUMMARY_QUERY_FIELDS = [
  'value.alt',
  'value.chrom',
  'value.clinical_significance',
  'value.clinvar_variation_id',
  'value.gnomad',
  'value.gold_stars',
  'value.in_gnomad',
  'value.major_consequence',
  'value.pos',
  'value.ref',
  'value.reference_genome',
  'value.review_status',
  'value.transcript_consequences',
  'value.variant_id',
]

const shapeVariantSummary = (context: any) => {
  const getConsequence = getConsequenceForContext(context)

  return (variant: any) => {
    const transcriptConsequence = getConsequence(variant) || {}

    return {
      ...omit(variant, 'transcript_consequences'), // Omit full transcript consequences list to avoid caching it
      transcript_consequence: transcriptConsequence,
    }
  }
}

// ================================================================================================
// Gene query
// ================================================================================================

const _fetchClinvarVariantsByGene = async (esClient: any, referenceGenome: any, gene: any) => {
  const filteredRegions = gene.exons.filter((exon: any) => exon.feature_type === 'CDS')
  const sortedRegions = filteredRegions.sort((r1: any, r2: any) => r1.xstart - r2.xstart)
  const padding = 75
  const paddedRegions = sortedRegions.map((r: any) => ({
    ...r,
    start: r.start - padding,
    stop: r.stop + padding,
    xstart: r.xstart - padding,
    xstop: r.xstop + padding,
  }))

  const mergedRegions = mergeOverlappingRegions(paddedRegions)

  const rangeQueries = mergedRegions.map((region: any) => ({
    range: {
      pos: {
        gte: region.start,
        lte: region.stop,
      },
    },
  }))

  const isLargeGene = largeGenes.includes(gene.gene_id)

  const pageSize = isLargeGene ? 500 : 10000

  const hits = await fetchAllSearchResults(esClient, {
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    index: CLINVAR_VARIANT_INDICES[referenceGenome],
    type: '_doc',
    size: pageSize,
    _source: SUMMARY_QUERY_FIELDS,
    body: {
      query: {
        bool: {
          filter: [{ term: { gene_id: gene.gene_id } }, { bool: { should: rangeQueries } }],
        },
      },
      sort: [{ pos: { order: 'asc' } }],
    },
  })

  return hits
    .map((hit: any) => hit._source.value)
    .map(shapeVariantSummary({ type: 'gene', geneId: gene.gene_id }))
}

export const fetchClinvarVariantsByGene = withCache(
  _fetchClinvarVariantsByGene,
  (_: any, datasetId: any, gene: any) => `clinvar_variants:${datasetId}:gene:${gene.gene_id}`,
  { expiration: 604800 }
)

// ================================================================================================
// Region query
// ================================================================================================

export const fetchClinvarVariantsByRegion = async (
  esClient: any,
  referenceGenome: any,
  region: any
) => {
  const hits = await fetchAllSearchResults(esClient, {
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    index: CLINVAR_VARIANT_INDICES[referenceGenome],
    type: '_doc',
    size: 10000,
    _source: SUMMARY_QUERY_FIELDS,
    body: {
      query: {
        bool: {
          filter: [
            { term: { chrom: region.chrom } },
            {
              range: {
                pos: {
                  gte: region.start,
                  lte: region.stop,
                },
              },
            },
          ],
        },
      },
      sort: [{ pos: { order: 'asc' } }],
    },
  })

  return hits.map((hit: any) => hit._source.value).map(shapeVariantSummary({ type: 'region' }))
}

// ================================================================================================
// Transcript query
// ================================================================================================

const _fetchClinvarVariantsByTranscript = async (
  esClient: any,
  referenceGenome: any,
  transcript: any
) => {
  const filteredRegions = transcript.exons.filter((exon: any) => exon.feature_type === 'CDS')
  const sortedRegions = filteredRegions.sort((r1: any, r2: any) => r1.xstart - r2.xstart)
  const padding = 75
  const paddedRegions = sortedRegions.map((r: any) => ({
    ...r,
    start: r.start - padding,
    stop: r.stop + padding,
    xstart: r.xstart - padding,
    xstop: r.xstop + padding,
  }))

  const mergedRegions = mergeOverlappingRegions(paddedRegions)

  const rangeQueries = mergedRegions.map((region: any) => ({
    range: {
      pos: {
        gte: region.start,
        lte: region.stop,
      },
    },
  }))

  const hits = await fetchAllSearchResults(esClient, {
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    index: CLINVAR_VARIANT_INDICES[referenceGenome],
    type: '_doc',
    size: 10000,
    _source: SUMMARY_QUERY_FIELDS,
    body: {
      query: {
        bool: {
          filter: [
            { term: { transcript_id: transcript.transcript_id } },
            { bool: { should: rangeQueries } },
          ],
        },
      },
      sort: [{ pos: { order: 'asc' } }],
    },
  })

  return hits
    .map((hit: any) => hit._source.value)
    .map(shapeVariantSummary({ type: 'transcript', transcriptId: transcript.transcript_id }))
}

export const fetchClinvarVariantsByTranscript = withCache(
  _fetchClinvarVariantsByTranscript,
  (_: any, datasetId: any, transcript: any) =>
    `clinvar_variants:${datasetId}:transcript:${transcript.transcript_id}`,
  { expiration: 3600 }
)
