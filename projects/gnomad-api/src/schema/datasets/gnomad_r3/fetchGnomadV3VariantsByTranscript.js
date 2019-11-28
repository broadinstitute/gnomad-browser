import { fetchAllSearchResults } from '../../../utilities/elasticsearch'

import shapeGnomadV3VariantSummary from './shapeGnomadV3VariantSummary'

const fetchGnomadV3VariantsByTranscript = async (ctx, transcript) => {
  const transcriptId = Number(transcript.transcript_id.slice(4))
  const filteredRegions = transcript.exons.filter(exon => exon.feature_type === 'CDS')
  const padding = 75
  const paddedRegions = filteredRegions.map(r => ({
    ...r,
    start: r.start - padding,
    stop: r.stop + padding,
    xstart: r.xstart - padding,
    xstop: r.xstop + padding,
  }))

  const rangeQueries = paddedRegions.map(region => ({
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

  return hits.map(shapeGnomadV3VariantSummary({ type: 'transcript', transcriptId }))
}

export default fetchGnomadV3VariantsByTranscript
