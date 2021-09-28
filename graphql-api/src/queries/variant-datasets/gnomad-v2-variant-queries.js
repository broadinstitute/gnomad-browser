const { omit } = require('lodash')

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

const GNOMAD_V2_VARIANT_INDEX = 'gnomad_v2_variants'

// ================================================================================================
// Count query
// ================================================================================================

// eslint-disable-next-line no-unused-vars
const countVariantsInRegion = async (esClient, region, subset) => {
  const response = await esClient.count({
    index: GNOMAD_V2_VARIANT_INDEX,
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

const formatVariantQualityMetrics = (qualityMetrics) => {
  // TODO: An older version of the data pipeline did not support raw and adj quality metric histograms.
  // gnomAD v2 has only raw histograms. Return those by default until the API schema is updated to allow
  // selecting which version to return.
  return {
    allele_balance: {
      alt: qualityMetrics.allele_balance.alt_raw,
    },
    genotype_depth: {
      alt: qualityMetrics.genotype_depth.alt_raw,
      all: qualityMetrics.genotype_depth.all_raw,
    },
    genotype_quality: {
      alt: qualityMetrics.genotype_quality.alt_raw,
      all: qualityMetrics.genotype_quality.all_raw,
    },
    site_quality_metrics: qualityMetrics.site_quality_metrics,
  }
}

const fetchVariantById = async (esClient, variantIdOrRsid, subset) => {
  const exomeSubset = subset
  const genomeSubset = subset === 'non_cancer' ? 'gnomad' : subset

  const idField = isRsId(variantIdOrRsid) ? 'rsids' : 'variant_id'
  const response = await esClient.search({
    index: GNOMAD_V2_VARIANT_INDEX,
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

  // AC raw may be undefined if the variant does not exist in one of exomes/genomes.
  // Or 0 if the variant exists in gnomAD but not in the selected subset.
  if (!variant.exome.freq[exomeSubset].ac_raw && !variant.genome.freq[genomeSubset].ac_raw) {
    throw new UserVisibleError('Variant not found in selected subset.')
  }

  const exomeFilters = variant.exome.filters || []
  const genomeFilters = variant.genome.filters || []

  if (variant.exome.freq[exomeSubset].ac === 0 && !exomeFilters.includes('AC0')) {
    exomeFilters.push('AC0')
  }
  if (variant.genome.freq[genomeSubset].ac === 0 && !genomeFilters.includes('AC0')) {
    genomeFilters.push('AC0')
  }

  const flags = getFlagsForContext({ type: 'region' })(variant)

  const lofCurationResults = await fetchLofCurationResultsByVariant(esClient, variant.variant_id)

  return {
    ...variant,
    reference_genome: 'GRCh37',
    colocated_variants: variant.colocated_variants[subset] || [],
    exome: variant.exome.freq[exomeSubset].ac_raw
      ? {
          ...variant.exome,
          ...variant.exome.freq[exomeSubset],
          quality_metrics: formatVariantQualityMetrics(variant.exome.quality_metrics),
          age_distribution: variant.exome.age_distribution[exomeSubset],
          filters: exomeFilters,
        }
      : null,
    genome: variant.genome.freq[genomeSubset].ac_raw
      ? {
          ...variant.genome,
          ...variant.genome.freq[genomeSubset],
          quality_metrics: formatVariantQualityMetrics(variant.genome.quality_metrics),
          age_distribution: variant.genome.age_distribution[genomeSubset],
          filters: genomeFilters,
          // Remove EAS sub-continental populations, which were not computed for genomes
          // TODO: Remove this after variants are reloaded
          // See https://github.com/broadinstitute/gnomad-browser/issues/759
          populations: variant.genome.freq[genomeSubset].populations.filter(
            (pop) =>
              !(pop.id.startsWith('eas_') && !(pop.id.endsWith('XX') || pop.id.endsWith('XY')))
          ),
        }
      : null,
    flags,
    lof_curations: lofCurationResults,
    transcript_consequences: variant.transcript_consequences || [],
  }
}

// ================================================================================================
// Shape variant summary
// ================================================================================================

const shapeVariantSummary = (exomeSubset, genomeSubset, context) => {
  const getConsequence = getConsequenceForContext(context)
  const getFlags = getFlagsForContext(context)

  return (variant) => {
    const transcriptConsequence = getConsequence(variant) || {}
    const flags = getFlags(variant)

    const exomeFilters = variant.exome.filters || []
    const genomeFilters = variant.genome.filters || []

    if (variant.exome.freq[exomeSubset].ac === 0 && !exomeFilters.includes('AC0')) {
      exomeFilters.push('AC0')
    }
    if (variant.genome.freq[genomeSubset].ac === 0 && !genomeFilters.includes('AC0')) {
      genomeFilters.push('AC0')
    }

    return {
      ...omit(variant, 'transcript_consequences'), // Omit full transcript consequences list to avoid caching it
      reference_genome: 'GRCh37',
      exome: variant.exome.freq[exomeSubset].ac_raw
        ? {
            ...omit(variant.exome, 'freq'), // Omit freq field to avoid caching extra copy of frequency information
            ...variant.exome.freq[exomeSubset],
            populations: variant.exome.freq[exomeSubset].populations.filter(
              (pop) => !(pop.id.includes('_') || pop.id === 'XX' || pop.id === 'XY')
            ),
            filters: exomeFilters,
          }
        : null,
      genome: variant.genome.freq[genomeSubset].ac_raw
        ? {
            ...omit(variant.genome, 'freq'), // Omit freq field to avoid caching extra copy of frequency information
            ...variant.genome.freq[genomeSubset],
            populations: variant.genome.freq[genomeSubset].populations.filter(
              (pop) => !(pop.id.includes('_') || pop.id === 'XX' || pop.id === 'XY')
            ),
            filters: genomeFilters,
          }
        : null,
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

  const exomeSubset = subset
  const genomeSubset = subset === 'non_cancer' ? 'gnomad' : subset

  const hits = await fetchAllSearchResults(esClient, {
    index: GNOMAD_V2_VARIANT_INDEX,
    type: '_doc',
    size: 10000,
    _source: [
      `value.exome.freq.${exomeSubset}`,
      `value.genome.freq.${genomeSubset}`,
      'value.exome.filters',
      'value.genome.filters',
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
    .filter(
      (variant) =>
        variant.exome.freq[exomeSubset].ac_raw > 0 || variant.genome.freq[genomeSubset].ac_raw > 0
    )
    .map(shapeVariantSummary(exomeSubset, genomeSubset, { type: 'gene', geneId: gene.gene_id }))

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

const fetchVariantsByRegion = async (esClient, region, subset) => {
  const exomeSubset = subset
  const genomeSubset = subset === 'non_cancer' ? 'gnomad' : subset

  const hits = await fetchAllSearchResults(esClient, {
    index: GNOMAD_V2_VARIANT_INDEX,
    type: '_doc',
    size: 10000,
    _source: [
      `value.exome.freq.${exomeSubset}`,
      `value.genome.freq.${genomeSubset}`,
      'value.exome.filters',
      'value.genome.filters',
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

  const variants = hits
    .map((hit) => hit._source.value)
    .filter(
      (variant) =>
        variant.exome.freq[exomeSubset].ac_raw > 0 || variant.genome.freq[genomeSubset].ac_raw > 0
    )
    .map(shapeVariantSummary(exomeSubset, genomeSubset, { type: 'region' }))

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

  const exomeSubset = subset
  const genomeSubset = subset === 'non_cancer' ? 'gnomad' : subset

  const hits = await fetchAllSearchResults(esClient, {
    index: GNOMAD_V2_VARIANT_INDEX,
    type: '_doc',
    size: 10000,
    _source: [
      `value.exome.freq.${exomeSubset}`,
      `value.genome.freq.${genomeSubset}`,
      'value.exome.filters',
      'value.genome.filters',
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
    .filter(
      (variant) =>
        variant.exome.freq[exomeSubset].ac_raw > 0 || variant.genome.freq[genomeSubset].ac_raw > 0
    )
    .map(
      shapeVariantSummary(exomeSubset, genomeSubset, {
        type: 'transcript',
        transcriptId: transcript.transcript_id,
      })
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

  const exomeSubset = subset
  const genomeSubset = subset === 'non_cancer' ? 'gnomad' : subset

  const hits = await fetchAllSearchResults(esClient, {
    index: GNOMAD_V2_VARIANT_INDEX,
    type: '_doc',
    size: 100,
    _source: [
      `value.exome.freq.${exomeSubset}`,
      `value.genome.freq.${genomeSubset}`,
      'value.variant_id',
    ],
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
    .filter(
      (variant) =>
        variant.exome.freq[exomeSubset].ac_raw > 0 || variant.genome.freq[genomeSubset].ac_raw > 0
    )
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
