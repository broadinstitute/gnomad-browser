import { omit } from 'lodash'
import { isRsId } from '@gnomad/identifiers'
import { fetchAllSearchResults } from '../helpers/elasticsearch-helpers'
import { mergeOverlappingRegions } from '../helpers/region-helpers'
import { getLofteeFlagsForContext } from '../variant-datasets/shared/flags'
import { getConsequenceForContext } from '../variant-datasets/shared/transcriptConsequence'

const GNOMAD_V3_MITOCHONDRIAL_VARIANT_INDEX = 'gnomad_v3_mitochondrial_variants'

// ================================================================================================
// Variant query
// ================================================================================================

const fetchMitochondrialVariantById = async (esClient: any, variantIdOrRsid: any) => {
  const idField = isRsId(variantIdOrRsid) ? 'rsids' : 'variant_id'
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

  if (response.body.hits.total.value === 0) {
    return null
  }

  const variant = response.body.hits.hits[0]._source.value

  // Remove nc_transcript flag due to issues with LOFTEE on mitochondrial variants
  const flags = getLofteeFlagsForContext({ type: 'region' })(variant).filter(
    (f: any) => f !== 'nc_transcript'
  )

  return {
    ...variant,
    reference_genome: 'GRCh38',
    chrom: variant.locus.contig.slice(3), // remove "chr" prefix
    pos: variant.locus.position,
    ref: variant.alleles[0],
    alt: variant.alleles[1],
    flags,
    // TODO: Include RefSeq transcripts once the browser supports them.
    transcript_consequences: (variant.transcript_consequences || []).filter((csq: any) =>
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
  'rsids',
  'transcript_consequences',
  'variant_id',
].map((f) => `value.${f}`)

const shapeMitochondrialVariantSummary = (context: any) => {
  const getConsequence = getConsequenceForContext(context)
  const getFlags = getLofteeFlagsForContext(context)

  return (variant: any) => {
    const transcriptConsequence = getConsequence(variant) || {}
    // Remove nc_transcript flag due to issues with LOFTEE on mitochondrial variants
    const flags = getFlags(variant).filter((f: any) => f !== 'nc_transcript')

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

const fetchMitochondrialVariantsByGene = async (esClient: any, gene: any) => {
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
    .map((hit: any) => hit._source.value)
    .map(shapeMitochondrialVariantSummary({ type: 'gene', geneId: gene.gene_id }))
}

// ================================================================================================
// Region query
// ================================================================================================

const fetchMitochondrialVariantsByRegion = async (esClient: any, region: any) => {
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
    .map((hit: any) => hit._source.value)
    .map(shapeMitochondrialVariantSummary({ type: 'region' }))
}

const queries = {
  fetchMitochondrialVariantById,
  fetchMitochondrialVariantsByGene,
  fetchMitochondrialVariantsByRegion,
}
export default queries
