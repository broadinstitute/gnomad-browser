const { isRsId } = require('@gnomad/identifiers')

const { UserVisibleError } = require('../../errors')

const { fetchAllSearchResults } = require('../helpers/elasticsearch-helpers')
const { mergeOverlappingRegions } = require('../helpers/region-helpers')
const {
  fetchLofCurationResultsByVariant,
  fetchLofCurationResultsByGene,
  fetchLofCurationResultsByRegion,
} = require('../lof-curation-result-queries')

const { getFlagsForContext } = require('./shared/flags')
const { getConsequenceForContext } = require('./shared/transcriptConsequence')

const EXAC_VARIANT_INDEX = 'exac_variants'

// ================================================================================================
// Count query
// ================================================================================================

const countVariantsInRegion = async (esClient, region) => {
  const response = await esClient.count({
    index: EXAC_VARIANT_INDEX,
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
    },
  })

  return response.body.count
}

// ================================================================================================
// Variant query
// ================================================================================================

const fetchVariantById = async (esClient, variantIdOrRsid) => {
  const idField = isRsId(variantIdOrRsid) ? 'rsids' : 'variant_id'
  const response = await esClient.search({
    index: EXAC_VARIANT_INDEX,
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
    throw new UserVisibleError('Variant not found')
  }

  // An rsID may match multiple variants
  if (response.body.hits.total > 1) {
    throw new UserVisibleError('Multiple variants found, query using variant ID to select one.')
  }

  const variant = response.body.hits.hits[0]._source.value

  const flags = getFlagsForContext({ type: 'region' })(variant)

  const lofCurationResults = await fetchLofCurationResultsByVariant(esClient, variant.variant_id)

  return {
    ...variant,
    reference_genome: 'GRCh37',
    exome: {
      ...variant.exome,
      quality_metrics: {
        // TODO: An older version of the data pipeline did not support raw and adj quality metric histograms.
        // ExAC has only raw histograms. Return those by default until the API schema is updated to allow selecting which version to return.
        genotype_depth: {
          alt: variant.exome.quality_metrics.genotype_depth.alt_raw,
          all: variant.exome.quality_metrics.genotype_depth.all_raw,
        },
        genotype_quality: {
          alt: variant.exome.quality_metrics.genotype_quality.alt_raw,
          all: variant.exome.quality_metrics.genotype_quality.all_raw,
        },
        site_quality_metrics: variant.exome.quality_metrics.site_quality_metrics,
      },
    },
    genome: null,
    flags,
    lof_curations: lofCurationResults,
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
    index: EXAC_VARIANT_INDEX,
    type: '_doc',
    size: 10000,
    _source: [
      'value.exome',
      'value.alt',
      'value.chrom',
      'value.flags',
      'value.pos',
      'value.ref',
      'value.rsids',
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

  const variants = hits
    .map((hit) => hit._source.value)
    .map(shapeVariantSummary({ type: 'gene', geneId: gene.gene_id }))

  const lofCurationResults = await fetchLofCurationResultsByGene(esClient, gene)
  const lofCurationResultsByVariant = {}
  lofCurationResults.forEach((result) => {
    lofCurationResultsByVariant[result.variant_id] = result.lof_curations.find(
      (c) => c.gene_id === gene.gene_id
    )
  })

  variants.forEach((variant) => {
    variant.lof_curation = lofCurationResultsByVariant[variant.variant_id] // eslint-disable-line no-param-reassign
  })

  return variants
}

// ================================================================================================
// Region query
// ================================================================================================

const fetchVariantsByRegion = async (esClient, region) => {
  const hits = await fetchAllSearchResults(esClient, {
    index: EXAC_VARIANT_INDEX,
    type: '_doc',
    size: 10000,
    _source: [
      'value.exome',
      'value.alt',
      'value.chrom',
      'value.flags',
      'value.pos',
      'value.ref',
      'value.rsids',
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

  const variants = hits.map((hit) => hit._source.value).map(shapeVariantSummary({ type: 'region' }))

  const lofCurationResults = await fetchLofCurationResultsByRegion(esClient, region)

  const lofCurationResultsByVariant = {}
  lofCurationResults.forEach((result) => {
    lofCurationResultsByVariant[result.variant_id] = result.lof_curations.reduce(
      (acc, c) => ({
        ...acc,
        [c.gene_id]: c,
      }),
      {}
    )
  })

  variants.forEach((variant) => {
    if (variant.transcript_consequence) {
      // eslint-disable-next-line no-param-reassign
      variant.lof_curation = (lofCurationResultsByVariant[variant.variant_id] || {})[
        variant.transcript_consequence.gene_id
      ]
    }
  })

  return variants
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
    index: EXAC_VARIANT_INDEX,
    type: '_doc',
    size: 10000,
    _source: [
      'value.exome',
      'value.alt',
      'value.chrom',
      'value.flags',
      'value.pos',
      'value.ref',
      'value.rsids',
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

// ================================================================================================
// Search
// ================================================================================================

const fetchMatchingVariants = async (esClient, { rsid = null, variantId = null }) => {
  let query
  if (rsid) {
    query = { term: { rsids: rsid } }
  } else if (variantId) {
    query = { term: { variant_id: variantId } }
  } else {
    throw new UserVisibleError('Unsupported search')
  }

  const hits = await fetchAllSearchResults(esClient, {
    index: EXAC_VARIANT_INDEX,
    type: '_doc',
    size: 100,
    _source: ['value.variant_id'],
    body: {
      query: {
        bool: {
          filter: query,
        },
      },
    },
  })

  return hits.map((hit) => hit._source.value).map((variant) => ({ variant_id: variant.variant_id }))
}

module.exports = {
  countVariantsInRegion,
  fetchVariantById,
  fetchVariantsByGene,
  fetchVariantsByRegion,
  fetchVariantsByTranscript,
  fetchMatchingVariants,
}
