import {
  lookupCoverageBuckets,
  lookUpCoverageByExons,
  lookupCoverageByIntervals,
} from '../../types/coverage'
import { lookupExonsByTranscriptId } from '../../types/exon'

// gnomAD 2.1 coverage was mistakenly indexed as type 'variant'

export const fetchGnomadExomeCoverageByTranscript = async (ctx, transcript) => {
  const exons = await lookupExonsByTranscriptId(ctx.database.gnomad, transcript.transcript_id)
  console.log(exons.length, 'exons')
  return lookUpCoverageByExons({
    elasticClient: ctx.database.elastic,
    index: 'gnomad_exome_coverage_2_1',
    type: 'variant',
    exons,
    chrom: transcript.chrom,
    obj: transcript,
    ctx,
  })
}

export const fetchGnomadGenomeCoverageByTranscript = async (ctx, transcript) => {
  const exons = await lookupExonsByTranscriptId(ctx.database.gnomad, transcript.transcript_id)
  return lookUpCoverageByExons({
    elasticClient: ctx.database.elastic,
    index: 'gnomad_genome_coverage_2_1',
    type: 'variant',
    exons,
    chrom: transcript.chrom,
    obj: transcript,
    ctx,
  })
}

export const fetchGnomadExomeCoverageByRegion = (ctx, region) => {
  const { chrom, start, stop } = region
  if (stop - start > 1600) {
    return lookupCoverageBuckets({
      elasticClient: ctx.database.elastic,
      index: 'gnomad_exome_coverage_2_1',
      type: 'variant',
      intervals: [{ start, stop }],
      chrom,
    })
  }
  return lookupCoverageByIntervals({
    elasticClient: ctx.database.elastic,
    index: 'gnomad_exome_coverage_2_1',
    type: 'variant',
    intervals: [{ start, stop }],
    chrom,
  })
}

export const fetchGnomadGenomeCoverageByRegion = (ctx, region) => {
  const { chrom, start, stop } = region
  if (stop - start > 1600) {
    return lookupCoverageBuckets({
      elasticClient: ctx.database.elastic,
      index: 'gnomad_genome_coverage_2_1',
      type: 'variant',
      intervals: [{ start, stop }],
      chrom,
    })
  }
  return lookupCoverageByIntervals({
    elasticClient: ctx.database.elastic,
    index: 'gnomad_genome_coverage_2_1',
    type: 'variant',
    intervals: [{ start, stop }],
    chrom,
  })
}
