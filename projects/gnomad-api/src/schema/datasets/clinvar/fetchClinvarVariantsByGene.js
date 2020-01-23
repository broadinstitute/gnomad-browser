import { fetchAllSearchResults } from '../../../utilities/elasticsearch'
import { mergeOverlappingRegions } from '../../../utilities/region'
import getClinvarIndex from './getClinvarIndex'
import shapeClinvarVariant from './shapeClinvarVariant'

const fetchClinvarVariantsByGene = async (ctx, gene) => {
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

  const index = getClinvarIndex(gene.reference_genome)
  const results = await fetchAllSearchResults(ctx.database.elastic, {
    index,
    type: 'documents',
    size: 10000,
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

  return results.map(
    shapeClinvarVariant({ type: 'gene', geneId, referenceGenome: gene.reference_genome })
  )
}

export default fetchClinvarVariantsByGene
