import { omit } from 'lodash'

import { isRsId } from '@gnomad/identifiers'

import { UserVisibleError } from '../../errors'

import { fetchLocalAncestryPopulationsByVariant } from '../local-ancestry-queries'
import { fetchAllSearchResults } from '../helpers/elasticsearch-helpers'
import { mergeOverlappingRegions } from '../helpers/region-helpers'

import { getFlagsForContext } from './shared/flags'
import { getConsequenceForContext } from './shared/transcriptConsequence'

const GNOMAD_V4_VARIANT_INDEX = 'gnomad_v4_variants'

// ================================================================================================
// Count query
// ================================================================================================

// eslint-disable-next-line no-unused-vars
const countVariantsInRegion = async (esClient: any, region: any, _subset: any) => {
  const response = await esClient.count({
    index: GNOMAD_V4_VARIANT_INDEX,
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

const fetchVariantById = async (esClient: any, variantIdOrRsid: any, subset: any) => {
  const idField = isRsId(variantIdOrRsid) ? 'rsids' : 'variant_id'
  const response = await esClient.search({
    index: GNOMAD_V4_VARIANT_INDEX,
    body: {
      query: {
        bool: {
          filter: { term: { [idField]: variantIdOrRsid } },
        },
      },
    },
    size: 1,
  })

  if (response.body.hits.total.value === 0) {
    throw new UserVisibleError('Variant not found')
  }

  // An rsID may match multiple variants
  if (response.body.hits.total.value > 1) {
    throw new UserVisibleError('Multiple variants found, query using variant ID to select one.')
  }

  const variant = response.body.hits.hits[0]._source.value

  const hasExomeVariant = variant.exome.freq[subset].ac_raw
  const hasGenomeVariant = variant.genome.freq[subset].ac_raw
  const hasJointFafData = variant.faf95_joint && variant.faf99_joint

  if (!(variant.genome.freq[subset] || {}).ac_raw && !(variant.exome.freq[subset] || {}).ac_raw) {
    throw new UserVisibleError('Variant not found in selected subset.')
  }

  const filters = variant.genome.filters || []

  if (variant.genome.freq[subset].ac === 0 && !filters.includes('AC0')) {
    filters.push('AC0')
  }

  if (variant.exome.freq[subset].ac === 0 && !filters.includes('AC0')) {
    filters.push('AC0')
  }

  const flags = getFlagsForContext({ type: 'region' })(variant)

  let { ancestry_groups: genome_ancestry_groups } = variant.genome.freq[subset]

  // Include HGDP and 1KG populations with gnomAD subsets
  if (variant.genome.freq.hgdp.ac_raw > 0) {
    genome_ancestry_groups = genome_ancestry_groups.concat(
      variant.genome.freq.hgdp.ancestry_groups.map((pop: any) => ({
        ...pop,
        id: `hgdp:${pop.id}`,
      }))
    )
  }
  // Some 1KG samples are included in v2. Since the 1KG population frequencies are based on the full v3.1 dataset,
  // they are invalid for the non-v2 subset.
  if (variant.genome.freq.tgp.ac_raw > 0 && subset !== 'non_v2') {
    genome_ancestry_groups = genome_ancestry_groups.concat(
      variant.genome.freq.tgp.ancestry_groups.map((pop: any) => ({
        ...pop,
        id: `1kg:${pop.id}`,
      }))
    )
  }

  const inSilicoPredictorIds = [
    'cadd',
    'revel_max',
    'spliceai_ds_max',
    'pangolin_largest_ds',
    'phylop',
    'sift_max',
    'polyphen_max',
  ]

  const inSilicoPredictorsList = inSilicoPredictorIds
    .map((id) => {
      if (variant.in_silico_predictors[id] || variant.in_silico_predictors[id] === 0) {
        const name: string = id
        if (id === 'cadd') {
          return {
            id: name,
            value: variant.in_silico_predictors.cadd.phred.toPrecision(3),
            flags: [],
          }
        }
        return { id: name, value: variant.in_silico_predictors[id].toPrecision(3), flags: [] }
      }
      return null
    })
    .filter((item) => item)

  const localAncestryPopulations =
    subset === 'all'
      ? await fetchLocalAncestryPopulationsByVariant(esClient, 'gnomad_r3', variant.variant_id)
      : { genome: null }

  return {
    ...variant,
    reference_genome: 'GRCh38',
    chrom: variant.locus.contig.slice(3), // remove "chr" prefix
    pos: variant.locus.position,
    ref: variant.alleles[0],
    alt: variant.alleles[1],
    colocated_variants: variant.colocated_variants[subset] || [],
    faf95_joint: hasJointFafData && {
      popmax_population: variant.faf95_joint.grpmax_gen_anc,
      popmax: variant.faf95_joint.grpmax,
    },
    faf99_joint: hasJointFafData && {
      popmax_population: variant.faf99_joint.grpmax_gen_anc,
      popmax: variant.faf99_joint.grpmax,
    },
    exome: hasExomeVariant && {
      ...variant.exome,
      ...variant.exome.freq[subset],
      filters,
      populations: variant.exome.freq[subset].ancestry_groups,
      faf95: hasExomeVariant &&
        variant.exome.faf95 && {
        popmax_population: variant.exome.faf95.grpmax_gen_anc,
        popmax: variant.exome.faf95.grpmax,
      },
      quality_metrics: {
        // TODO: An older version of the data pipeline stored only adj quality metric histograms.
        // Maintain the same behavior by returning the adj version until the API schema is updated to allow
        // selecting which version to return.
        allele_balance: {
          alt: variant.exome.quality_metrics.allele_balance.alt_adj,
        },
        genotype_depth: {
          alt: variant.exome.quality_metrics.genotype_depth.alt_adj,
          all: variant.exome.quality_metrics.genotype_depth.all_adj,
        },
        genotype_quality: {
          alt: variant.exome.quality_metrics.genotype_quality.alt_adj,
          all: variant.exome.quality_metrics.genotype_quality.all_adj,
        },
        site_quality_metrics: variant.exome.quality_metrics.site_quality_metrics.filter((m: any) =>
          Number.isFinite(m.value)
        ),
      },
      local_ancestry_populations: [],
    },
    genome: hasGenomeVariant && {
      ...variant.genome,
      ...variant.genome.freq[subset],
      filters,
      populations: genome_ancestry_groups,
      faf95: hasGenomeVariant &&
        variant.genome.faf95 && {
        popmax_population: variant.genome.faf95.grpmax_gen_anc,
        popmax: variant.genome.faf95.grpmax,
      },
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
        site_quality_metrics: variant.genome.quality_metrics.site_quality_metrics.filter((m: any) =>
          Number.isFinite(m.value)
        ),
      },
      local_ancestry_populations: localAncestryPopulations.genome,
    },
    flags,
    // TODO: Include RefSeq transcripts once the browser supports them.
    transcript_consequences: (variant.transcript_consequences || []).filter((csq: any) =>
      csq.gene_id.startsWith('ENSG')
    ),
    in_silico_predictors: inSilicoPredictorsList,
  }
}

// ================================================================================================
// Shape variant summary
// ================================================================================================

const shapeVariantSummary = (subset: any, context: any) => {
  const getConsequence = getConsequenceForContext(context)
  const getFlags = getFlagsForContext(context)

  return (variant: any) => {
    const transcriptConsequence = getConsequence(variant) || {}
    const flags = getFlags(variant)

    const filters = variant.genome.filters || []

    const hasExomeVariant = variant.exome.freq[subset].ac_raw
    const hasGenomeVariant = variant.genome.freq[subset].ac_raw

    if (variant.genome.freq[subset].ac === 0 && !filters.includes('AC0')) {
      filters.push('AC0')
    }

    if (variant.exome.freq[subset].ac === 0 && !filters.includes('AC0')) {
      filters.push('AC0')
    }

    const hasJointFafData = variant.faf95_joint && variant.faf99_joint

    return {
      ...omit(variant, 'transcript_consequences', 'locus', 'alleles'), // Omit full transcript consequences list to avoid caching it
      reference_genome: 'GRCh38',
      chrom: variant.locus.contig.slice(3), // Remove "chr" prefix
      pos: variant.locus.position,
      ref: variant.alleles[0],
      alt: variant.alleles[1],
      exome: hasExomeVariant
        ? {
          ...omit(variant.exome, 'freq'), // Omit freq field to avoid caching extra copy of frequency information
          ...variant.exome.freq[subset],
          populations: variant.exome.freq[subset].ancestry_groups.filter(
            (pop: any) => !(pop.id.includes('_') || pop.id === 'XX' || pop.id === 'XY')
          ),
          filters,
        }
        : null,
      genome: hasGenomeVariant
        ? {
          ...omit(variant.genome, 'freq'), // Omit freq field to avoid caching extra copy of frequency information
          ...variant.genome.freq[subset],
          populations: variant.genome.freq[subset].ancestry_groups.filter(
            (pop: any) => !(pop.id.includes('_') || pop.id === 'XX' || pop.id === 'XY')
          ),
          filters,
        }
        : null,
      flags,
      transcript_consequence: transcriptConsequence,
      faf95_joint: hasJointFafData && {
        popmax_population: variant.faf95_joint.grpmax_gen_anc,
        popmax: variant.faf95_joint.grpmax,
      },
      faf99_joint: hasJointFafData && {
        popmax_population: variant.faf99_joint.grpmax_gen_anc,
        popmax: variant.faf99_joint.grpmax,
      },
    }
  }
}

// ================================================================================================
// Gene query
// ================================================================================================

const fetchVariantsByGene = async (esClient: any, gene: any, _subset: any) => {
  const subset = 'all'
  const exomeSubset = 'all'
  const genomeSubset = 'all'

  if (gene.symbol === "TTN") {
    throw new UserVisibleError("Due to the size of TTN the variant table is temporarily unavailable in the browser or API")
  }

  try {
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
        'locus.position': {
          gte: region.start,
          lte: region.stop,
        },
      },
    }))

    const hits = await fetchAllSearchResults(esClient, {
      index: GNOMAD_V4_VARIANT_INDEX,
      type: '_doc',
      size: 10000,
      _source: [
        `value.exome.freq.${exomeSubset}`,
        `value.genome.freq.${genomeSubset}`,
        'value.exome.filters',
        'value.genome.filters',
        'value.alleles',
        // 'value.caid',
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

    const shapedHits = hits
      .map((hit: any) => hit._source.value)
      .filter(
        (variant: any) =>
          variant.genome.freq[subset].ac_raw > 0 || variant.exome.freq[subset].ac_raw > 0
      )
      .map(shapeVariantSummary(subset, { type: 'gene', geneId: gene.gene_id }))

    return shapedHits
  } catch (error) {
    throw new Error(`'Error fetching variants by gene:', ${error}`)
  }
}

// ================================================================================================
// Region query
// ================================================================================================

const fetchVariantsByRegion = async (esClient: any, region: any, _subset: any) => {
  const subset = 'all'
  const exomeSubset = 'all'
  const genomeSubset = 'all'

  const hits = await fetchAllSearchResults(esClient, {
    index: GNOMAD_V4_VARIANT_INDEX,
    type: '_doc',
    size: 10000,
    _source: [
      `value.exome.freq.${exomeSubset}`,
      `value.genome.freq.${genomeSubset}`,
      'value.exome.filters',
      'value.genome.filters',
      'value.alleles',
      // 'value.caid',
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
    .map((hit: any) => hit._source.value)
    .filter(
      (variant: any) =>
        variant.genome.freq[subset].ac_raw > 0 || variant.exome.freq[subset].ac_raw > 0
    )
    .map(shapeVariantSummary(subset, { type: 'region' }))
}

// ================================================================================================
// Transcript query
// ================================================================================================

const fetchVariantsByTranscript = async (esClient: any, transcript: any, _subset: any) => {
  const subset = 'all'
  const exomeSubset = 'all'
  const genomeSubset = 'all'


  if (transcript.gene.symbol === "TTN") {
    throw new UserVisibleError("Due to the size of TTN the variant table is temporarily unavailable in the browser or API")
  }

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
      'locus.position': {
        gte: region.start,
        lte: region.stop,
      },
    },
  }))

  const hits = await fetchAllSearchResults(esClient, {
    index: GNOMAD_V4_VARIANT_INDEX,
    type: '_doc',
    size: 10000,
    _source: [
      `value.exome.freq.${exomeSubset}`,
      `value.genome.freq.${genomeSubset}`,
      'value.exome.filters',
      'value.genome.filters',
      'value.genome.filters',
      'value.alleles',
      // 'value.caid',
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
    .map((hit: any) => hit._source.value)
    .filter(
      (variant: any) =>
        variant.genome.freq[subset].ac_raw > 0 || variant.exome.freq[subset].ac_raw > 0
    )
    .map(
      shapeVariantSummary(subset, { type: 'transcript', transcriptId: transcript.transcript_id })
    )
}

// ================================================================================================
// Search
// ================================================================================================

const fetchMatchingVariants = async (
  esClient: any,
  { caid = null, rsid = null, variantId = null },
  subset: any
) => {
  let query
  if (caid) {
    query = { term: { caid } }
  } else if (rsid) {
    query = { term: { rsids: rsid } }
  } else if (variantId) {
    query = { term: { variant_id: variantId } }
  } else {
    throw new UserVisibleError('Unsupported search')
  }

  const hits = await fetchAllSearchResults(esClient, {
    index: GNOMAD_V4_VARIANT_INDEX,
    type: '_doc',
    size: 100,
    _source: [`value.genome.freq.${subset}`, `value.exome.freq.${subset}`, 'value.variant_id'],
    body: {
      query: {
        bool: {
          filter: query,
        },
      },
    },
  })

  return hits
    .map((hit: any) => hit._source.value)
    .filter(
      (variant: any) =>
        variant.genome.freq[subset].ac_raw > 0 || variant.exome.freq[subset].ac_raw > 0
    )
    .map((variant: any) => ({
      variant_id: variant.variant_id,
    }))
}

const gnomadV4VariantQueries = {
  countVariantsInRegion,
  fetchVariantById,
  fetchVariantsByGene,
  fetchVariantsByRegion,
  fetchVariantsByTranscript,
  fetchMatchingVariants,
}

export default gnomadV4VariantQueries
