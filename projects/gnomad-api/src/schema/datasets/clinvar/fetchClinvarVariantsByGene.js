import { fetchAllSearchResults } from '../../../utilities/elasticsearch'
import { mergeOverlappingRegions } from '../../../utilities/region'
import { lookupExonsByGeneId } from '../../types/exon'

const fetchClinvarVariantsByGene = async (ctx, geneId) => {
  const geneExons = await lookupExonsByGeneId(ctx.database.gnomad, geneId)
  const filteredRegions = geneExons.filter(exon => exon.feature_type === 'CDS')
  const sortedRegions = filteredRegions.sort((r1, r2) => r1.xstart - r2.xstart)
  const padding = 75
  const paddedRegions = sortedRegions.map(r => ({
    ...r,
    start: r.start - padding,
    stop: r.stop + padding,
    xstart: r.xstart - padding,
    xstop: r.xstop + padding,
  }))

  const mergedRegions = mergeOverlappingRegions(paddedRegions)

  const rangeQueries = mergedRegions.map(region => ({
    range: {
      pos: {
        gte: region.start,
        lte: region.stop,
      },
    },
  }))

  const results = await fetchAllSearchResults(ctx.database.elastic, {
    index: 'clinvar_grch37',
    type: 'variant',
    _source: [
      'allele_id',
      'alt',
      'chrom',
      'clinical_significance',
      'gene_id_to_consequence_json',
      'gold_stars',
      'pos',
      'ref',
      'variant_id',
      'xpos',
    ],
    size: 10000,
    body: {
      query: {
        bool: {
          filter: [{ term: { gene_ids: geneId } }, { bool: { should: rangeQueries } }],
        },
      },
      sort: [{ pos: { order: 'asc' } }],
    },
  })

  return results.map(hit => {
    const doc = hit._source // eslint-disable-line no-underscore-dangle
    const consequence = JSON.parse(doc.gene_id_to_consequence_json)[geneId]

    return {
      // Variant ID fields
      variantId: doc.variant_id,
      chrom: doc.chrom,
      pos: doc.pos,
      xpos: doc.xpos,
      ref: doc.ref,
      alt: doc.alt,
      // ClinVar specific fields
      allele_id: doc.allele_id,
      clinical_significance: doc.clinical_significance,
      consequence,
      gold_stars: doc.gold_stars,
    }
  })
}

export default fetchClinvarVariantsByGene
