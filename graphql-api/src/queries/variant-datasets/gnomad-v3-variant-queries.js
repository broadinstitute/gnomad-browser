const { omit } = require('lodash')

const { isRsId } = require('@gnomad/identifiers')

const { fetchAllSearchResults } = require('../helpers/elasticsearch-helpers')
const { mergeOverlappingRegions } = require('../helpers/region-helpers')

const { getFlagsForContext } = require('./shared/flags')
const { getConsequenceForContext } = require('./shared/transcriptConsequence')

// ================================================================================================
// Count query
// ================================================================================================

// eslint-disable-next-line no-unused-vars
const countVariantsInRegion = async (esClient, region, subset) => {
  const response = await esClient.search({
    index: 'gnomad_v3_variants',
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

const fetchVariantById = async (esClient, variantIdOrRsid, subset) => {
  const idField = isRsId(variantIdOrRsid) ? 'rsid' : 'variant_id'
  const response = await esClient.search({
    index: 'gnomad_v3_variants',
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

  if (variant.genome.freq[subset].ac_raw === 0) {
    return null
  }

  const filters = variant.genome.filters || []

  if (variant.genome.freq[subset].ac === 0 && !filters.includes('AC0')) {
    filters.push('AC0')
  }

  const flags = getFlagsForContext({ type: 'region' })(variant)

  // Include HGDP and 1KG populations with gnomAD subsets
  let populations = [
    ...variant.genome.freq[subset].populations,
    ...variant.genome.freq.hgdp.populations.map((pop) => ({ ...pop, id: `hgdp:${pop.id}` })),
  ]

  // Some 1KG samples are included in v2. Since the 1KG population frequencies are based on the full v3.1 dataset,
  // they are invalid for the non-v2 subset.
  if (subset !== 'non_v2') {
    populations = populations.concat(
      variant.genome.freq.tgp.populations.map((pop) => ({ ...pop, id: `1kg:${pop.id}` }))
    )
  }

  const inSilicoPredictors = []
  if (variant.annotations.revel.revel_score != null) {
    inSilicoPredictors.push({
      id: 'revel',
      value: variant.annotations.revel.revel_score.toPrecision(3),
    })
  }
  if (variant.annotations.cadd.phred != null) {
    inSilicoPredictors.push({ id: 'cadd', value: variant.annotations.cadd.phred.toPrecision(3) })
  }
  if (variant.annotations.splice_ai.max_ds != null) {
    inSilicoPredictors.push({
      id: 'splice_ai',
      value: `${variant.annotations.splice_ai.max_ds.toPrecision(3)} (${
        variant.annotations.splice_ai.splice_consequence
      })`,
    })
  }
  if (variant.annotations.primate_ai.primate_ai_score != null) {
    inSilicoPredictors.push({
      id: 'primate_ai',
      value: variant.annotations.primate_ai.primate_ai_score.toPrecision(3),
    })
  }

  return {
    ...variant,
    reference_genome: 'GRCh38',
    chrom: variant.locus.contig.slice(3), // remove "chr" prefix
    pos: variant.locus.position,
    ref: variant.alleles[0],
    alt: variant.alleles[1],
    colocated_variants: variant.colocated_variants[subset] || [],
    exome: null,
    genome: {
      ...variant.genome,
      ...variant.genome.freq[subset],
      filters,
      populations,
      quality_metrics: {
        ...variant.genome.quality_metrics,
        site_quality_metrics: variant.genome.quality_metrics.site_quality_metrics.filter((m) =>
          Number.isFinite(m.value)
        ),
      },
    },
    flags,
    // TODO: Include RefSeq transcripts once the browser supports them.
    transcript_consequences: (variant.transcript_consequences || []).filter((csq) =>
      csq.gene_id.startsWith('ENSG')
    ),
    in_silico_predictors: inSilicoPredictors,
  }
}

// ================================================================================================
// Shape variant summary
// ================================================================================================

const shapeVariantSummary = (subset, context) => {
  const getConsequence = getConsequenceForContext(context)
  const getFlags = getFlagsForContext(context)

  return (variant) => {
    const transcriptConsequence = getConsequence(variant) || {}
    const flags = getFlags(variant)

    const filters = variant.genome.filters || []

    if (variant.genome.freq[subset].ac === 0 && !filters.includes('AC0')) {
      filters.push('AC0')
    }

    return {
      ...omit(variant, 'transcript_consequences', 'locus', 'alleles'), // Omit full transcript consequences list to avoid caching it
      reference_genome: 'GRCh38',
      chrom: variant.locus.contig.slice(3), // Remove "chr" prefix
      pos: variant.locus.position,
      ref: variant.alleles[0],
      alt: variant.alleles[1],
      exome: null,
      genome: {
        ...omit(variant.genome, 'freq'), // Omit freq field to avoid caching extra copy of frequency information
        ...variant.genome.freq[subset],
        populations: variant.genome.freq[subset].populations.filter((pop) => !pop.id.includes('_')),
        filters,
      },
      flags,
      transcript_consequence: transcriptConsequence,
    }
  }
}

// ================================================================================================
// Gene query
// ================================================================================================

const fetchVariantsByGene = async (esClient, gene, subset) => {
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
    index: 'gnomad_v3_variants',
    type: '_doc',
    size: 10000,
    _source: [
      `value.genome.freq.${subset}`,
      'value.genome.filters',
      'value.alleles',
      'value.locus',
      'value.flags',
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
    .filter((variant) => variant.genome.freq[subset].ac_raw > 0)
    .map(shapeVariantSummary(subset, { type: 'gene', geneId: gene.gene_id }))
}

// ================================================================================================
// Region query
// ================================================================================================

const fetchVariantsByRegion = async (esClient, region, subset) => {
  const hits = await fetchAllSearchResults(esClient, {
    index: 'gnomad_v3_variants',
    type: '_doc',
    size: 10000,
    _source: [
      `value.genome.freq.${subset}`,
      'value.genome.filters',
      'value.alleles',
      'value.locus',
      'value.flags',
      'value.rsid',
      'value.transcript_consequences',
      'value.variant_id',
    ],
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
    .filter((variant) => variant.genome.freq[subset].ac_raw > 0)
    .map(shapeVariantSummary(subset, { type: 'region' }))
}

// ================================================================================================
// Transcript query
// ================================================================================================

const fetchVariantsByTranscript = async (esClient, transcript, subset) => {
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
    index: 'gnomad_v3_variants',
    type: '_doc',
    size: 10000,
    _source: [
      `value.genome.freq.${subset}`,
      'value.genome.filters',
      'value.alleles',
      'value.locus',
      'value.flags',
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
    .filter((variant) => variant.genome.freq[subset].ac_raw > 0)
    .map(
      shapeVariantSummary(subset, { type: 'transcript', transcriptId: transcript.transcript_id })
    )
}

module.exports = {
  countVariantsInRegion,
  fetchVariantById,
  fetchVariantsByGene,
  fetchVariantsByRegion,
  fetchVariantsByTranscript,
}
