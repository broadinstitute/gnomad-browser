const { isRsId } = require('@gnomad/identifiers')

const { fetchAllSearchResults } = require('../helpers/elasticsearch-helpers')
const { mergeOverlappingRegions } = require('../helpers/region-helpers')

const { getFlagsForContext } = require('./shared/flags')
const { getConsequenceForContext } = require('./shared/transcriptConsequence')

// ================================================================================================
// Count query
// ================================================================================================

const countVariantsInRegion = async (esClient, region) => {
  const response = await esClient.search({
    index: 'exac_variants',
    type: '_doc',
    body: {
      query: {
        bool: {
          filter: [
            { term: { 'locus.contig': region.chrom } },
            {
              range: {
                'locus.position': {
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

const fetchVariantById = async (esClient, variantIdOrRsid) => {
  const idField = isRsId(variantIdOrRsid) ? 'rsid' : 'variant_id'
  const response = await esClient.search({
    index: 'exac_variants',
    type: '_doc',
    body: {
      query: {
        bool: {
          filter: { term: { [idField]: variantIdOrRsid } },
        },
      },
    },
    size: 1,
  })

  if (response.body.hits.total === 0) {
    return null
  }

  const variant = response.body.hits.hits[0]._source.value

  const flags = getFlagsForContext({ type: 'region' })(variant)

  return {
    ...variant,
    reference_genome: 'GRCh37',
    genome: null,
    flags,
    transcript_consequences: variant.transcript_consequences || [],
  }
}

// ================================================================================================
// Shape variant summary
// ================================================================================================

const shapeVariantSummary = (context) => {
  const getConsequence = getConsequenceForContext(context)
  const getFlags = getFlagsForContext(context)

  return (variant) => {
    const transcriptConsequence = getConsequence(variant) || {}
    const flags = getFlags(variant)

    return {
      ...variant,
      reference_genome: 'GRCh37',
      flags,
      transcript_consequence: transcriptConsequence,
    }
  }
}

// ================================================================================================
// Gene query
// ================================================================================================

const fetchVariantsByGene = async (esClient, gene) => {
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
      'locus.position': {
        gte: region.start,
        lte: region.stop,
      },
    },
  }))

  const hits = await fetchAllSearchResults(esClient, {
    index: 'exac_variants',
    type: '_doc',
    size: 10000,
    _source: [
      'value.exome',
      'value.alt',
      'value.chrom',
      'value.flags',
      'value.pos',
      'value.ref',
      'value.rsid',
      'value.transcript_consequences',
      'value.variant_id',
    ],
    body: {
      query: {
        bool: {
          filter: [{ term: { gene_id: gene.gene_id } }, { bool: { should: rangeQueries } }],
        },
      },
      sort: [{ 'locus.position': { order: 'asc' } }],
    },
  })

  return hits
    .map((hit) => hit._source.value)
    .map(shapeVariantSummary({ type: 'gene', geneId: gene.gene_id }))
}

// ================================================================================================
// Region query
// ================================================================================================

const fetchVariantsByRegion = async (esClient, region) => {
  const hits = await fetchAllSearchResults(esClient, {
    index: 'exac_variants',
    type: '_doc',
    size: 10000,
    _source: [
      'value.exome',
      'value.alt',
      'value.chrom',
      'value.flags',
      'value.pos',
      'value.ref',
      'value.rsid',
      'value.transcript_consequences',
      'value.variant_id',
    ],
    body: {
      query: {
        bool: {
          filter: [
            { term: { 'locus.contig': region.chrom } },
            {
              range: {
                'locus.position': {
                  gte: region.start,
                  lte: region.stop,
                },
              },
            },
          ],
        },
      },
      sort: [{ 'locus.position': { order: 'asc' } }],
    },
  })

  return hits.map((hit) => hit._source.value).map(shapeVariantSummary({ type: 'region' }))
}

// ================================================================================================
// Transcript query
// ================================================================================================

const fetchVariantsByTranscript = async (esClient, transcript) => {
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
      'locus.position': {
        gte: region.start,
        lte: region.stop,
      },
    },
  }))

  const hits = await fetchAllSearchResults(esClient, {
    index: 'exac_variants',
    type: '_doc',
    size: 10000,
    _source: [
      'value.exome',
      'value.alt',
      'value.chrom',
      'value.flags',
      'value.pos',
      'value.ref',
      'value.rsid',
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
      sort: [{ 'locus.position': { order: 'asc' } }],
    },
  })

  return hits
    .map((hit) => hit._source.value)
    .map(shapeVariantSummary({ type: 'transcript', transcriptId: transcript.transcript_id }))
}

module.exports = {
  countVariantsInRegion,
  fetchVariantById,
  fetchVariantsByGene,
  fetchVariantsByRegion,
  fetchVariantsByTranscript,
}
