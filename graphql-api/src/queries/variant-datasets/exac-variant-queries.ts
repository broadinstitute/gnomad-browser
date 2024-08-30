import { isRsId } from '@gnomad/identifiers'

import { UserVisibleError } from '../../errors'

import { fetchAllSearchResults } from '../helpers/elasticsearch-helpers'
import { mergeOverlappingRegions } from '../helpers/region-helpers'
import {
  fetchLofCurationResultsByVariant,
  fetchLofCurationResultsByGene,
  fetchLofCurationResultsByRegion,
} from '../lof-curation-result-queries'

import { getLofteeFlagsForContext } from './shared/flags'
import { getConsequenceForContext } from './shared/transcriptConsequence'

const EXAC_VARIANT_INDEX = 'exac_variants'

// ================================================================================================
// Count query
// ================================================================================================

export const countVariantsInRegion = async (esClient: any, region: any) => {
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

export const fetchVariantById = async (esClient: any, variantIdOrRsid: any) => {
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

  if (response.body.hits.total.value === 0) {
    throw new UserVisibleError('Variant not found')
  }

  // An rsID may match multiple variants
  if (response.body.hits.total.value > 1) {
    throw new UserVisibleError('Multiple variants found, query using variant ID to select one.')
  }

  const variant = response.body.hits.hits[0]._source.value

  const flags = getLofteeFlagsForContext({ type: 'region' })(variant)

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
      flags: variant.exome.flags || [],
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

const shapeVariantSummary = (context: any) => {
  const getConsequence = getConsequenceForContext(context)
  const getFlags = getLofteeFlagsForContext(context)

  return (variant: any) => {
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

export const fetchVariantsByGene = async (esClient: any, gene: any) => {
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
    index: EXAC_VARIANT_INDEX,
    type: '_doc',
    size: 10000,
    _source: [
      'value.exome',
      'value.alt',
      'value.caid',
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
    .map((hit: any) => hit._source.value)
    .map(shapeVariantSummary({ type: 'gene', geneId: gene.gene_id }))

  const lofCurationResults = await fetchLofCurationResultsByGene(esClient, gene)
  const lofCurationResultsByVariant = {}
  lofCurationResults.forEach((result: any) => {
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    lofCurationResultsByVariant[result.variant_id] = result.lof_curations.find(
      (c: any) => c.gene_id === gene.gene_id
    )
  })

  variants.forEach((variant: any) => {
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    variant.lof_curation = lofCurationResultsByVariant[variant.variant_id] // eslint-disable-line no-param-reassign
  })

  return variants
}

// ================================================================================================
// Region query
// ================================================================================================

export const fetchVariantsByRegion = async (esClient: any, region: any) => {
  const hits = await fetchAllSearchResults(esClient, {
    index: EXAC_VARIANT_INDEX,
    type: '_doc',
    size: 10000,
    _source: [
      'value.exome',
      'value.alt',
      'value.caid',
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
    .map((hit: any) => hit._source.value)
    .map(shapeVariantSummary({ type: 'region' }))

  const lofCurationResults = await fetchLofCurationResultsByRegion(esClient, region)

  const lofCurationResultsByVariant = {}
  lofCurationResults.forEach((result: any) => {
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    lofCurationResultsByVariant[result.variant_id] = result.lof_curations.reduce(
      // @ts-expect-error TS(7006) FIXME: Parameter 'acc' implicitly has an 'any' type.
      (acc, c) => ({
        ...acc,
        [c.gene_id]: c,
      }),
      {}
    )
  })

  variants.forEach((variant: any) => {
    if (variant.transcript_consequence) {
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
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

export const fetchVariantsByTranscript = async (esClient: any, transcript: any) => {
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
    index: EXAC_VARIANT_INDEX,
    type: '_doc',
    size: 10000,
    _source: [
      'value.exome',
      'value.alt',
      'value.caid',
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
    .map((hit: any) => hit._source.value)
    .map(shapeVariantSummary({ type: 'transcript', transcriptId: transcript.transcript_id }))
}

// ================================================================================================
// Search
// ================================================================================================

export const fetchMatchingVariants = async (
  esClient: any,
  { caid = null, rsid = null, variantId = null }
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

  return hits
    .map((hit: any) => hit._source.value)
    .map((variant: any) => ({
      variant_id: variant.variant_id,
    }))
}

const exacVariantQueries = {
  countVariantsInRegion,
  fetchVariantById,
  fetchVariantsByGene,
  fetchVariantsByRegion,
  fetchVariantsByTranscript,
  fetchMatchingVariants,
}

export default exacVariantQueries
