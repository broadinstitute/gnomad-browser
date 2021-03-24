const { omit } = require('lodash')

const { isRsId } = require('@gnomad/identifiers')

const { UserVisibleError } = require('../../errors')

const { fetchAllSearchResults } = require('../helpers/elasticsearch-helpers')
const { mergeOverlappingRegions } = require('../helpers/region-helpers')

const { getFlagsForContext } = require('./shared/flags')
const { getConsequenceForContext } = require('./shared/transcriptConsequence')

const GNOMAD_V3_VARIANT_INDEX = 'gnomad_v3_variants'

// ================================================================================================
// Count query
// ================================================================================================

// eslint-disable-next-line no-unused-vars
const countVariantsInRegion = async (esClient, region, subset) => {
  const response = await esClient.count({
    index: GNOMAD_V3_VARIANT_INDEX,
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

const fetchVariantById = async (esClient, variantIdOrRsid, subset) => {
  const idField = isRsId(variantIdOrRsid) ? 'rsids' : 'variant_id'
  const response = await esClient.search({
    index: GNOMAD_V3_VARIANT_INDEX,
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

  if (variant.genome.freq[subset].ac_raw === 0) {
    throw new UserVisibleError('Variant not found in selected subset.')
  }

  const filters = variant.genome.filters || []

  if (variant.genome.freq[subset].ac === 0 && !filters.includes('AC0')) {
    filters.push('AC0')
  }

  const flags = getFlagsForContext({ type: 'region' })(variant)

  let { populations } = variant.genome.freq[subset]

  if (!populations.some(({ id }) => id === 'XX' || id === 'XY')) {
    // "XX" and "XY" populations were originally not stored for v3.1.
    // Reconstruct them from population-specific XX and XY populations.
    const xxPopulations = variant.genome.freq[subset].populations.filter(({ id }) =>
      id.endsWith('_XX')
    )
    const xyPopulations = variant.genome.freq[subset].populations.filter(({ id }) =>
      id.endsWith('_XY')
    )
    populations.push(
      {
        id: 'XX',
        ac: xxPopulations.reduce((acc, pop) => acc + pop.ac, 0),
        an: xxPopulations.reduce((acc, pop) => acc + pop.an, 0),
        homozygote_count: xxPopulations.reduce((acc, pop) => acc + pop.homozygote_count, 0),
        hemizygote_count: xxPopulations.reduce((acc, pop) => acc + pop.hemizygote_count, 0),
      },
      {
        id: 'XY',
        ac: xyPopulations.reduce((acc, pop) => acc + pop.ac, 0),
        an: xyPopulations.reduce((acc, pop) => acc + pop.an, 0),
        homozygote_count: xyPopulations.reduce((acc, pop) => acc + pop.homozygote_count, 0),
        hemizygote_count: xyPopulations.reduce((acc, pop) => acc + pop.hemizygote_count, 0),
      }
    )
  }

  // Include HGDP and 1KG populations with gnomAD subsets
  // TODO: An earlier version of the data pipeline stored subset population frequencies even if the variant was
  // not present in the subset. After updating variants, these checks for ac_raw > 0 should no longer be necessary.
  if (variant.genome.freq.hgdp.ac_raw > 0) {
    populations = populations.concat(
      variant.genome.freq.hgdp.populations.map((pop) => ({ ...pop, id: `hgdp:${pop.id}` }))
    )
  }
  // Some 1KG samples are included in v2. Since the 1KG population frequencies are based on the full v3.1 dataset,
  // they are invalid for the non-v2 subset.
  if (variant.genome.freq.tgp.ac_raw > 0 && subset !== 'non_v2') {
    populations = populations.concat(
      variant.genome.freq.tgp.populations.map((pop) => ({ ...pop, id: `1kg:${pop.id}` }))
    )
  }

  // TODO: An earlier version of the data pipeline had missing values for AC, AN, and homozygote count for XX population
  // frequencies for variants in chrY. After reloading variants, this should no longer be necessary.
  if (variant.locus.contig === 'chrY') {
    populations = populations.map((pop) => {
      if (pop.id === 'XX' || pop.id.endsWith('XX')) {
        return {
          id: pop.id,
          ac: 0,
          an: 0,
          homozygote_count: 0,
          hemizygote_count: 0,
        }
      }
      return pop
    })
  }

  const inSilicoPredictorsList = []
  const inSilicoPredictors = variant.in_silico_predictors
  if (inSilicoPredictors.revel.revel_score != null) {
    inSilicoPredictorsList.push({
      id: 'revel',
      value: inSilicoPredictors.revel.revel_score.toPrecision(3),
      flags: inSilicoPredictors.revel.has_duplicate ? ['has_duplicate'] : [],
    })
  }
  if (inSilicoPredictors.cadd.phred != null) {
    inSilicoPredictorsList.push({
      id: 'cadd',
      value: inSilicoPredictors.cadd.phred.toPrecision(3),
      flags: inSilicoPredictors.cadd.has_duplicate ? ['has_duplicate'] : [],
    })
  }
  if (inSilicoPredictors.splice_ai.splice_ai_score != null) {
    inSilicoPredictorsList.push({
      id: 'splice_ai',
      value: `${inSilicoPredictors.splice_ai.splice_ai_score.toPrecision(3)} (${
        inSilicoPredictors.splice_ai.splice_consequence
      })`,
      flags: inSilicoPredictors.splice_ai.has_duplicate ? ['has_duplicate'] : [],
    })
  }
  if (inSilicoPredictors.primate_ai.primate_ai_score != null) {
    inSilicoPredictorsList.push({
      id: 'primate_ai',
      value: inSilicoPredictors.primate_ai.primate_ai_score.toPrecision(3),
      flags: inSilicoPredictors.primate_ai.has_duplicate ? ['has_duplicate'] : [],
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
        // TODO: An older version of the data pipeline stored only adj quality metric histograms.
        // Maintain the same behavior by returning the adj version until the API schema is updated to allow
        // selecting which version to return.
        allele_balance: {
          alt: variant.genome.quality_metrics.allele_balance.alt_adj,
        },
        genotype_depth: {
          alt: variant.genome.quality_metrics.genotype_depth.alt_adj,
          all: variant.genome.quality_metrics.genotype_depth.all_adj,
        },
        genotype_quality: {
          alt: variant.genome.quality_metrics.genotype_quality.alt_adj,
          all: variant.genome.quality_metrics.genotype_quality.all_adj,
        },
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
    in_silico_predictors: inSilicoPredictorsList,
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
        populations: variant.genome.freq[subset].populations.filter(
          (pop) => !(pop.id.includes('_') || pop.id === 'XX' || pop.id === 'XY')
        ),
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
    index: GNOMAD_V3_VARIANT_INDEX,
    type: '_doc',
    size: 10000,
    _source: [
      `value.genome.freq.${subset}`,
      'value.genome.filters',
      'value.alleles',
      'value.locus',
      'value.flags',
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
    index: GNOMAD_V3_VARIANT_INDEX,
    type: '_doc',
    size: 10000,
    _source: [
      `value.genome.freq.${subset}`,
      'value.genome.filters',
      'value.alleles',
      'value.locus',
      'value.flags',
      'value.rsids',
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
    index: GNOMAD_V3_VARIANT_INDEX,
    type: '_doc',
    size: 10000,
    _source: [
      `value.genome.freq.${subset}`,
      'value.genome.filters',
      'value.alleles',
      'value.locus',
      'value.flags',
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
    .filter((variant) => variant.genome.freq[subset].ac_raw > 0)
    .map(
      shapeVariantSummary(subset, { type: 'transcript', transcriptId: transcript.transcript_id })
    )
}

// ================================================================================================
// Search
// ================================================================================================

const fetchMatchingVariants = async (esClient, { rsid = null, variantId = null }, subset) => {
  let query
  if (rsid) {
    query = { term: { rsids: rsid } }
  } else if (variantId) {
    query = { term: { variant_id: variantId } }
  } else {
    throw new UserVisibleError('Unsupported search')
  }

  const hits = await fetchAllSearchResults(esClient, {
    index: GNOMAD_V3_VARIANT_INDEX,
    type: '_doc',
    size: 100,
    _source: [`value.genome.freq.${subset}`, 'value.variant_id'],
    body: {
      query: {
        bool: {
          filter: query,
        },
      },
    },
  })

  return hits
    .map((hit) => hit._source.value)
    .filter((variant) => variant.genome.freq[subset].ac_raw > 0)
    .map((variant) => ({ variant_id: variant.variant_id }))
}

module.exports = {
  countVariantsInRegion,
  fetchVariantById,
  fetchVariantsByGene,
  fetchVariantsByRegion,
  fetchVariantsByTranscript,
  fetchMatchingVariants,
}
