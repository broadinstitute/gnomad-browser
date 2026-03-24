import {
  fetchHaplotypeVariantsForRegion,
  fetchMethylationForRegion,
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
    const rawData = data.recomb1000GAvg?.[chrom] || []
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
      const chrom = normalizeChrom(args.chrom)
      const docs = await fetchHaplotypeVariantsForRegion(
        ctx.esClient,
        chrom,
        args.start,
        args.stop
      )
      const samples = reconstructSamplesFromVariants(docs)
      return createHaplotypeGroups(
        samples,
        args.start,
        args.stop,
        args.min_allele_freq || 0,
        args.sort_by || 'similarity_score'
      )
    },
    methylation: async (_obj: any, args: any, ctx: any) => {
      const chrom = normalizeChrom(args.chrom)
      return fetchMethylationForRegion(ctx.esClient, chrom, args.start, args.stop, args.sample)
    },
    recombination_rate: async (_obj: any, args: any, _ctx: any) => {
      const chrom = normalizeChrom(args.chrom)
      return fetchRecombinationRate(chrom, args.start, args.stop)
    },
  },
}

export default resolvers
