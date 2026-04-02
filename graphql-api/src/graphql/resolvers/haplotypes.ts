import {
  fetchHaplotypeVariantsForRegion,
  fetchMethylationForRegion,
  fetchMethylationSummaryForRegion,
  fetchMethylationOutliersForRegion,
  fetchLRCoverageForRegion,
} from '../../queries/haplotype-queries'
import {
  reconstructSamplesFromVariants,
  createHaplotypeGroups,
} from '../../queries/haplotype-grouping'
import { withCache } from '../../cache'
import logger from '../../logger'

const _fetchRecombinationRate = async (chrom: string, start: number, stop: number) => {
  try {
    const url = `http://api.genome.ucsc.edu/getData/track?genome=hg38;track=recomb1000GAvg;chrom=${chrom};start=${start};end=${stop}`
    const response = await fetch(url)
    const data = await response.json()
    // UCSC API returns a flat list when chrom is specified, or keyed by chrom otherwise
    const rawData = Array.isArray(data.recomb1000GAvg)
      ? data.recomb1000GAvg
      : data.recomb1000GAvg?.[chrom] || []
    return rawData.map((d: any) => ({ start: d.start, end: d.end, value: d.value }))
  } catch (error) {
    logger.warn(`Failed to fetch recombination rate from UCSC: ${error}`)
    return []
  }
}

const fetchRecombinationRate = withCache(
  _fetchRecombinationRate,
  (chrom: string, start: number, stop: number) => `recombination:${chrom}:${start}:${stop}`,
  { expiration: 86400 }
)

const normalizeChrom = (chrom: string) =>
  chrom.startsWith('chr') ? chrom : `chr${chrom}`

const resolvers = {
  Query: {
    haplotype_groups: async (_obj: any, args: any, ctx: any) => {
      try {
        const chrom = normalizeChrom(args.chrom)
        const docs = await fetchHaplotypeVariantsForRegion(
          ctx.esClient,
          chrom,
          args.start,
          args.stop
        )
        logger.info(`haplotype_groups: fetched ${docs.length} docs for ${chrom}:${args.start}-${args.stop}`)
        const samples = reconstructSamplesFromVariants(docs)
        const result = createHaplotypeGroups(
          samples,
          args.start,
          args.stop,
          args.min_allele_freq || 0,
          args.sort_by || 'similarity_score'
        )
        return result
      } catch (e: any) {
        logger.error(`haplotype_groups error: ${e.message}\n${e.stack}`)
        throw e
      }
    },
    methylation: async (_obj: any, args: any, ctx: any) => {
      const chrom = normalizeChrom(args.chrom)
      return fetchMethylationForRegion(ctx.esClient, chrom, args.start, args.stop, args.samples)
    },
    methylation_summary: async (_obj: any, args: any, ctx: any) => {
      const chrom = normalizeChrom(args.chrom)
      return fetchMethylationSummaryForRegion(ctx.esClient, chrom, args.start, args.stop)
    },
    methylation_outliers: async (_obj: any, args: any, ctx: any) => {
      const chrom = normalizeChrom(args.chrom)
      return fetchMethylationOutliersForRegion(ctx.esClient, chrom, args.start, args.stop)
    },
    recombination_rate: async (_obj: any, args: any, _ctx: any) => {
      const chrom = normalizeChrom(args.chrom)
      return fetchRecombinationRate(chrom, args.start, args.stop)
    },
    lr_coverage: async (_obj: any, args: any, ctx: any) => {
      const chrom = normalizeChrom(args.chrom)
      return fetchLRCoverageForRegion(ctx.esClient, chrom, args.start, args.stop)
    },
  },
}

export default resolvers
