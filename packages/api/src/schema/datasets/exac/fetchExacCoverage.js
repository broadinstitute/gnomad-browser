import {
  lookupCoverageBuckets,
  lookUpCoverageByExons,
  lookupCoverageByIntervals,
} from '../../types/coverage'
import { lookupExonsByTranscriptId } from '../../types/exon'

export const fetchExacExomeCoverageByTranscript = async (ctx, transcript) => {
  const exons = await lookupExonsByTranscriptId(ctx.database.gnomad, transcript.transcript_id)
  return lookUpCoverageByExons({
    elasticClient: ctx.database.elastic,
    index: 'exacv1_coverage',
    exons,
    chrom: transcript.chrom,
    obj: transcript,
    ctx,
  })
}

export const fetchExacGenomeCoverageByTranscript = () => []

export const fetchExacExomeCoverageByRegion = (ctx, region) => {
  const { chrom, start, stop } = region
  if (stop - start > 1600) {
    return lookupCoverageBuckets({
      elasticClient: ctx.database.elastic,
      index: 'exacv1_coverage',
      intervals: [{ start, stop }],
      chrom,
    })
  }
  return lookupCoverageByIntervals({
    elasticClient: ctx.database.elastic,
    index: 'exacv1_coverage',
    intervals: [{ start, stop }],
    chrom,
  })
}

export const fetchExacGenomeCoverageByRegion = () => []
