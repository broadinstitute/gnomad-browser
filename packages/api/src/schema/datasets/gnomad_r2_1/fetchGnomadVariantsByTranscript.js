import { fetchAllSearchResults } from '../../../utilities/elasticsearch'
import { lookupExonsByTranscriptId } from '../../types/exon'
import {
  annotateVariantsWithMNVFlag,
  fetchGnomadMNVsByIntervals,
} from './gnomadMultiNucleotideVariants'
import mergeExomeAndGenomeVariantSummaries from './mergeExomeAndGenomeVariantSummaries'
import shapeGnomadVariantSummary from './shapeGnomadVariantSummary'

const fetchGnomadVariantsByTranscript = async (ctx, transcriptId, gene, subset) => {
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

  const requests = [
    { index: 'gnomad_exomes_2_1_1', subset },
    // All genome samples are non_cancer, so separate non-cancer numbers are not stored
    { index: 'gnomad_genomes_2_1_1', subset: subset === 'non_cancer' ? 'gnomad' : subset },
  ]

  const [exomeVariants, genomeVariants] = await Promise.all(
    requests.map(async ({ index, subset }) => {
      const hits = await fetchAllSearchResults(ctx.database.elastic, {
        index,
        type: 'variant',
        size: 10000,
        _source: [
          `${subset}.AC_adj`,
          `${subset}.AN_adj`,
          `${subset}.nhomalt_adj`,
          'alt',
          'chrom',
          'filters',
          'flags',
          'nonpar',
          'pos',
          'ref',
          'rsid',
          'sortedTranscriptConsequences',
          'variant_id',
          'xpos',
        ],
        body: {
          query: {
            bool: {
              filter: [
                {
                  nested: {
                    path: 'sortedTranscriptConsequences',
                    query: {
                      term: { 'sortedTranscriptConsequences.transcript_id': transcriptId },
                    },
                  },
                },
                { bool: { should: rangeQueries } },
                { range: { [`${subset}.AC_raw`]: { gt: 0 } } },
              ],
            },
          },
          sort: [{ pos: { order: 'asc' } }],
        },
      })

      return hits.map(shapeGnomadVariantSummary(subset, { type: 'transcript', transcriptId }))
    })
  )

  const combinedVariants = mergeExomeAndGenomeVariantSummaries(exomeVariants, genomeVariants)

  // TODO: This can be fetched in parallel with exome/genome data
  const mnvs = await fetchGnomadMNVsByIntervals(ctx, paddedRegions)
  annotateVariantsWithMNVFlag(combinedVariants, mnvs)

  return combinedVariants
}

export default fetchGnomadVariantsByTranscript
