import { fetchAllSearchResults } from '../../../utilities/elasticsearch'
import getClinvarIndex from './getClinvarIndex'
import shapeClinvarVariant from './shapeClinvarVariant'

const fetchClinvarVariantsByTranscript = async (ctx, transcript) => {
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

  const index = getClinvarIndex(transcript.reference_genome)
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

  return results.map(
    shapeClinvarVariant({
      type: 'transcript',
      transcriptId,
      referenceGenome: transcript.reference_genome,
    })
  )
}

export default fetchClinvarVariantsByTranscript
