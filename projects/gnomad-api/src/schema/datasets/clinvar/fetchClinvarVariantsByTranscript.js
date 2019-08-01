import { fetchAllSearchResults } from '../../../utilities/elasticsearch'
import { lookupExonsByTranscriptId } from '../../types/exon'

const fetchClinvarVariantsByTranscript = async (ctx, transcriptId) => {
  const transcriptExons = await lookupExonsByTranscriptId(ctx.database.gnomad, transcriptId)
  const filteredRegions = transcriptExons.filter(exon => exon.feature_type === 'CDS')
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
      'gold_stars',
      'pos',
      'ref',
      'transcript_id_to_consequence_json',
      'variant_id',
      'xpos',
    ],
    size: 10000,
    body: {
      query: {
        bool: {
          filter: [{ term: { transcript_ids: transcriptId } }, { bool: { should: rangeQueries } }],
        },
      },
      sort: [{ pos: { order: 'asc' } }],
    },
  })

  return results.map(hit => {
    const doc = hit._source // eslint-disable-line no-underscore-dangle
    const consequence = JSON.parse(doc.transcript_id_to_consequence_json)[transcriptId]

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

export default fetchClinvarVariantsByTranscript
