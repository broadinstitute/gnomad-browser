const { omit } = require('lodash')

const { isRsId } = require('@gnomad/identifiers')

const { fetchAllSearchResults } = require('../helpers/elasticsearch-helpers')
const { mergeOverlappingRegions } = require('../helpers/region-helpers')

const { getFlagsForContext } = require('../variant-datasets/shared/flags')
const { getConsequenceForContext } = require('../variant-datasets/shared/transcriptConsequence')

const GNOMAD_V3_MITOCHONDRIAL_VARIANT_INDEX = 'gnomad_v3_mitochondrial_variants'

// ================================================================================================
// Variant query
// ================================================================================================

const fetchMitochondrialVariantById = async (esClient, variantIdOrRsid) => {
  const idField = isRsId(variantIdOrRsid) ? 'rsid' : 'variant_id'
  const response = await esClient.search({
    index: GNOMAD_V3_MITOCHONDRIAL_VARIANT_INDEX,
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

  // Remove nc_transcript flag due to issues with LOFTEE on mitochondrial variants
  const flags = getFlagsForContext({ type: 'region' })(variant).filter((f) => f !== 'nc_transcript')

  return {
    ...variant,
    reference_genome: 'GRCh38',
    chrom: variant.locus.contig.slice(3), // remove "chr" prefix
    pos: variant.locus.position,
    ref: variant.alleles[0],
    alt: variant.alleles[1],
    flags,
    // TODO: Include RefSeq transcripts once the browser supports them.
    transcript_consequences: (variant.transcript_consequences || []).filter((csq) =>
      csq.gene_id.startsWith('ENSG')
    ),
  }
}

// ================================================================================================
// Shape variant summary
// ================================================================================================

const FIELDS_TO_FETCH = [
  'ac',
  'ac_het',
  'ac_hom',
  'alleles',
  'an',
  'filters',
  'flags',
  'locus',
  'max_heteroplasmy',
  'rsid',
  'transcript_consequences',
  'variant_id',
].map((f) => `value.${f}`)

const shapeMitochondrialVariantSummary = (context) => {
  const getConsequence = getConsequenceForContext(context)
  const getFlags = getFlagsForContext(context)

  return (variant) => {
    const transcriptConsequence = getConsequence(variant) || {}
    // Remove nc_transcript flag due to issues with LOFTEE on mitochondrial variants
    const flags = getFlags(variant).filter((f) => f !== 'nc_transcript')

    return {
      ...omit(variant, 'transcript_consequences', 'locus', 'alleles'), // Omit full transcript consequences list to avoid caching it
      reference_genome: 'GRCh38',
      chrom: variant.locus.contig.slice(3), // Remove "chr" prefix
      pos: variant.locus.position,
      ref: variant.alleles[0],
      alt: variant.alleles[1],
      flags,
      transcript_consequence: transcriptConsequence,
    }
  }
}

// ================================================================================================
// Gene query
// ================================================================================================

const fetchMitochondrialVariantsByGene = async (esClient, gene) => {
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
    index: GNOMAD_V3_MITOCHONDRIAL_VARIANT_INDEX,
    type: '_doc',
    size: 10000,
    _source: FIELDS_TO_FETCH,
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
    .map(shapeMitochondrialVariantSummary({ type: 'gene', geneId: gene.gene_id }))
}

// ================================================================================================
// Region query
// ================================================================================================

const fetchMitochondrialVariantsByRegion = async (esClient, region) => {
  const hits = await fetchAllSearchResults(esClient, {
    index: GNOMAD_V3_MITOCHONDRIAL_VARIANT_INDEX,
    type: '_doc',
    size: 10000,
    _source: FIELDS_TO_FETCH,
    body: {
      query: {
        bool: {
          filter: [
            { term: { 'locus.contig': `chr${region.chrom}` } },
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

  return hits
    .map((hit) => hit._source.value)
    .map(shapeMitochondrialVariantSummary({ type: 'region' }))
}

module.exports = {
  fetchMitochondrialVariantById,
  fetchMitochondrialVariantsByGene,
  fetchMitochondrialVariantsByRegion,
}
