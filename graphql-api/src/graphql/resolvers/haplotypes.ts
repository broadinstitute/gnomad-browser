import { fetchMQTLAssociations } from '../../queries/mqtl-queries'
import {
  fetchGroupedHaplotypeVariants,
  fetchMethylationForRegion,
  fetchMethylationSummaryForRegion,
  fetchMethylationOutliersForRegion,
  fetchLRCoverageForRegion,
} from '../../queries/haplotype-queries'
import {
  createHaplotypeGroupsFromGrouped,
} from '../../queries/haplotype-grouping'
import { withCache } from '../../cache'
import logger from '../../logger'

// --- Timing helpers ---

const now = () => performance.now()

type TimingEntry = { label: string; ms: number; meta?: Record<string, number | string> }

const addTiming = (ctx: any, entry: TimingEntry) => {
  if (!ctx._lrTimings) ctx._lrTimings = []
  ctx._lrTimings.push(entry)
}

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
    mqtl_associations: async (_obj: any, args: any, ctx: any) => {
      const t0 = now()
      try {
        const chrom = normalizeChrom(args.chrom)
        const result = await fetchMQTLAssociations(
          ctx.esClient,
          chrom,
          args.start,
          args.stop,
          args.min_af || 0,
          args.max_distance || 5000,
          args.min_carriers || 5
        )
        addTiming(ctx, {
          label: 'mqtl_associations',
          ms: now() - t0,
          meta: { associations: result.length },
        })
        return result
      } catch (e: any) {
        logger.error(`mqtl_associations error: ${e.message}\n${e.stack}`)
        throw e
      }
    },
    haplotype_groups: async (_obj: any, args: any, ctx: any) => {
      try {
        const chrom = normalizeChrom(args.chrom)

        const tFetch = now()
        const rows = await fetchGroupedHaplotypeVariants(
          ctx.esClient,
          chrom,
          args.start,
          args.stop
        )
        const fetchMs = now() - tFetch

        logger.info(`haplotype_groups: fetched ${(rows as any[]).length} grouped rows for ${chrom}:${args.start}-${args.stop}`)

        const tGroup = now()
        const result = createHaplotypeGroupsFromGrouped(
          rows as any[],
          chrom,
          args.start,
          args.stop,
          args.min_allele_freq || 0,
          args.sort_by || 'similarity_score'
        )
        const groupMs = now() - tGroup

        addTiming(ctx, {
          label: 'haplotype_groups',
          ms: fetchMs + groupMs,
          meta: {
            clickhouse_ms: Math.round(fetchMs * 100) / 100,
            grouping_ms: Math.round(groupMs * 100) / 100,
            ch_rows: (rows as any[]).length,
            groups: result.groups.length,
          },
        })
        return result
      } catch (e: any) {
        logger.error(`haplotype_groups error: ${e.message}\n${e.stack}`)
        throw e
      }
    },
    methylation: async (_obj: any, args: any, ctx: any) => {
      const t0 = now()
      const chrom = normalizeChrom(args.chrom)
      const result = await fetchMethylationForRegion(ctx.esClient, chrom, args.start, args.stop, args.samples)
      addTiming(ctx, {
        label: 'methylation',
        ms: now() - t0,
        meta: { rows: (result as any[]).length },
      })
      return result
    },
    methylation_summary: async (_obj: any, args: any, ctx: any) => {
      const t0 = now()
      const chrom = normalizeChrom(args.chrom)
      const result = await fetchMethylationSummaryForRegion(ctx.esClient, chrom, args.start, args.stop)
      addTiming(ctx, {
        label: 'methylation_summary',
        ms: now() - t0,
        meta: { rows: (result as any[]).length },
      })
      return result
    },
    methylation_outliers: async (_obj: any, args: any, ctx: any) => {
      const t0 = now()
      const chrom = normalizeChrom(args.chrom)
      const result = await fetchMethylationOutliersForRegion(ctx.esClient, chrom, args.start, args.stop)
      addTiming(ctx, {
        label: 'methylation_outliers',
        ms: now() - t0,
        meta: { samples: result?.total_samples ?? 0 },
      })
      return result
    },
    recombination_rate: async (_obj: any, args: any, ctx: any) => {
      const t0 = now()
      const chrom = normalizeChrom(args.chrom)
      const result = await fetchRecombinationRate(chrom, args.start, args.stop)
      addTiming(ctx, {
        label: 'recombination_rate',
        ms: now() - t0,
        meta: { rows: result.length },
      })
      return result
    },
    lr_coverage: async (_obj: any, args: any, ctx: any) => {
      const t0 = now()
      const chrom = normalizeChrom(args.chrom)
      const result = await fetchLRCoverageForRegion(ctx.esClient, chrom, args.start, args.stop)
      addTiming(ctx, {
        label: 'lr_coverage',
        ms: now() - t0,
        meta: { rows: (result as any[]).length },
      })
      return result
    },
  },
}

export default resolvers
