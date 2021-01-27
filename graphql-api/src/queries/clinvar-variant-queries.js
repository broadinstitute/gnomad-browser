const { omit } = require('lodash')

const { withCache } = require('../cache')

const { fetchAllSearchResults } = require('./helpers/elasticsearch-helpers')
const { mergeOverlappingRegions } = require('./helpers/region-helpers')
const { getConsequenceForContext } = require('./variant-datasets/shared/transcriptConsequence')

// ================================================================================================
// Count query
// ================================================================================================

const countClinvarVariantsInRegion = async (esClient, referenceGenome, region) => {
  const response = await esClient.search({
    index: `clinvar_${referenceGenome.toLowerCase()}_variants`,
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
      aggs: {
        unique_variants: {
          cardinality: {
            field: 'variant_id',
          },
        },
      },
    },
    size: 0,
  })

  return response.body.aggregations.unique_variants.value
}

// ================================================================================================
// Variant query
// ================================================================================================

const fetchClinvarVariantById = async (esClient, referenceGenome, variantId) => {
  const response = await esClient.search({
    index: `clinvar_${referenceGenome.toLowerCase()}_variants`,
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

  if (response.body.hits.total === 0) {
    return null
  }

  const variant = response.body.hits.hits[0]._source.value

  return variant
}

// ================================================================================================
// Shape variant summary
// ================================================================================================

const shapeVariantSummary = (context) => {
  const getConsequence = getConsequenceForContext(context)

  return (variant) => {
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

const fetchClinvarVariantsByGene = async (esClient, referenceGenome, gene) => {
  const filteredRegions = gene.exons.filter((exon) => exon.feature_type === 'CDS')
  const sortedRegions = filteredRegions.sort((r1, r2) => r1.xstart - r2.xstart)
  const padding = 75
  const paddedRegions = sortedRegions.map((r) => ({
    ...r,
    start: r.start - padding,
    stop: r.stop + padding,
    xstart: r.xstart - padding,
    xstop: r.xstop + padding,
  }))

  const mergedRegions = mergeOverlappingRegions(paddedRegions)

  const rangeQueries = mergedRegions.map((region) => ({
    range: {
      pos: {
        gte: region.start,
        lte: region.stop,
      },
    },
  }))

  const hits = await fetchAllSearchResults(esClient, {
    index: `clinvar_${referenceGenome.toLowerCase()}_variants`,
    type: '_doc',
    size: 10000,
    _source: [
      'value.alt',
      'value.chrom',
      'value.clinical_significance',
      'value.clinvar_variation_id',
      'value.gold_stars',
      'value.major_consequence',
      'value.pos',
      'value.ref',
      'value.reference_genome',
      'value.review_status',
      'value.transcript_consequences',
      'value.variant_id',
    ],
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
    .map((hit) => hit._source.value)
    .map(shapeVariantSummary({ type: 'gene', geneId: gene.gene_id }))
}

// ================================================================================================
// Region query
// ================================================================================================

const fetchClinvarVariantsByRegion = async (esClient, referenceGenome, region) => {
  const hits = await fetchAllSearchResults(esClient, {
    index: `clinvar_${referenceGenome.toLowerCase()}_variants`,
    type: '_doc',
    size: 10000,
    _source: [
      'value.alt',
      'value.chrom',
      'value.clinical_significance',
      'value.clinvar_variation_id',
      'value.gold_stars',
      'value.major_consequence',
      'value.pos',
      'value.ref',
      'value.reference_genome',
      'value.review_status',
      'value.transcript_consequences',
      'value.variant_id',
    ],
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

  return hits.map((hit) => hit._source.value).map(shapeVariantSummary({ type: 'region' }))
}

// ================================================================================================
// Transcript query
// ================================================================================================

const fetchClinvarVariantsByTranscript = async (esClient, referenceGenome, transcript) => {
  const filteredRegions = transcript.exons.filter((exon) => exon.feature_type === 'CDS')
  const sortedRegions = filteredRegions.sort((r1, r2) => r1.xstart - r2.xstart)
  const padding = 75
  const paddedRegions = sortedRegions.map((r) => ({
    ...r,
    start: r.start - padding,
    stop: r.stop + padding,
    xstart: r.xstart - padding,
    xstop: r.xstop + padding,
  }))

  const mergedRegions = mergeOverlappingRegions(paddedRegions)

  const rangeQueries = mergedRegions.map((region) => ({
    range: {
      pos: {
        gte: region.start,
        lte: region.stop,
      },
    },
  }))

  const hits = await fetchAllSearchResults(esClient, {
    index: `clinvar_${referenceGenome.toLowerCase()}_variants`,
    type: '_doc',
    size: 10000,
    _source: [
      'value.alt',
      'value.chrom',
      'value.clinical_significance',
      'value.clinvar_variation_id',
      'value.gold_stars',
      'value.major_consequence',
      'value.pos',
      'value.ref',
      'value.reference_genome',
      'value.review_status',
      'value.transcript_consequences',
      'value.variant_id',
    ],
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
    .map((hit) => hit._source.value)
    .map(shapeVariantSummary({ type: 'transcript', transcriptId: transcript.transcript_id }))
}

module.exports = {
  countClinvarVariantsInRegion,
  fetchClinvarVariantById,
  fetchClinvarVariantsByGene: withCache(
    fetchClinvarVariantsByGene,
    (_, datasetId, gene) => `clinvar_variants:${datasetId}:gene:${gene.gene_id}`,
    { expiration: 604800 }
  ),
  fetchClinvarVariantsByRegion,
  fetchClinvarVariantsByTranscript: withCache(
    fetchClinvarVariantsByTranscript,
    (_, datasetId, transcript) =>
      `clinvar_variants:${datasetId}:transcript:${transcript.transcript_id}`,
    { expiration: 3600 }
  ),
}
