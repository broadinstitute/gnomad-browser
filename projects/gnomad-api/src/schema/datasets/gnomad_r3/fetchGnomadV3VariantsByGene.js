import { fetchAllSearchResults } from '../../../utilities/elasticsearch'
import { mergeOverlappingRegions } from '../../../utilities/region'

import shapeGnomadV3VariantSummary from './shapeGnomadV3VariantSummary'

const fetchGnomadV3VariantsByGene = async (ctx, gene) => {
  const geneId = Number(gene.gene_id.slice(4))
  const filteredRegions = gene.exons.filter(exon => exon.feature_type === 'CDS')
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
      'locus.position': {
        gte: region.start,
        lte: region.stop,
      },
    },
  }))

  const hits = await fetchAllSearchResults(ctx.database.elastic, {
    index: 'gnomad_r3_variants',
    type: 'documents',
    size: 10000,
    _source: [
      'alleles',
      'filters',
      'freq.adj',
      'lcr',
      'locus',
      'nonpar',
      'rsid',
      'sorted_transcript_consequences',
      'variant_id',
    ],
    body: {
      query: {
        bool: {
          filter: [
            {
              nested: {
                path: 'sorted_transcript_consequences',
                query: {
                  term: { 'sorted_transcript_consequences.gene_id': geneId },
                },
              },
            },
            { bool: { should: rangeQueries } },
          ],
        },
      },
      sort: [{ 'locus.position': { order: 'asc' } }],
    },
  })

  return hits.map(shapeGnomadV3VariantSummary({ type: 'gene', geneId }))
}

export default fetchGnomadV3VariantsByGene
