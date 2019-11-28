import { fetchAllSearchResults } from '../../../utilities/elasticsearch'

import shapeExacVariantSummary from './shapeExacVariantSummary'

const fetchExacVariantsByTranscript = async (ctx, transcript) => {
  const transcriptId = Number(transcript.transcript_id.slice(4))
  const filteredRegions = transcript.exons.filter(exon => exon.feature_type === 'CDS')
  const padding = 75
  const rangeQueries = filteredRegions.map(region => ({
    range: {
      'locus.position': {
        gte: region.start - padding,
        lte: region.stop + padding,
      },
    },
  }))

  const hits = await fetchAllSearchResults(ctx.database.elastic, {
    index: 'exac_variants',
    type: 'documents',
    size: 10000,
    _source: [
      'AC_Adj',
      'AC_Hemi',
      'AC_Hom',
      'AN_Adj',
      'alleles',
      'filters',
      'locus',
      'populations',
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
                  term: { 'sorted_transcript_consequences.transcript_id': transcriptId },
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

  return hits.map(shapeExacVariantSummary({ type: 'transcript', transcriptId }))
}

export default fetchExacVariantsByTranscript
