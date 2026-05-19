import { fetchMQTLAssociations } from '../../queries/mqtl-queries'
import {
  fetchGroupedHaplotypeVariants,
  fetchGroupedTrvVariants,
  fetchHaplotypeGroupAssignments,
  fetchDistinctHaplotypeVariants,
  fetchTrvCarrierAlts,
  fetchSampleMetadata,
  fetchMethylationForRegion,
  fetchMethylationSummaryForRegion,
  fetchMethylationOutliersForRegion,
  fetchLRCoverageForRegion,
  fetchSTRHistogram,
} from '../../queries/haplotype-queries'
import {
  createHaplotypeGroupsFromGrouped,
  assembleHaplotypeGroups,
} from '../../queries/haplotype-grouping'
import { fetchStrCatalog, categorizeLocus, parseMotifStats } from '../../queries/str-catalog'
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

const trvCache = new Map<string, any>()

const fetchTrvHaplotypeGroups = async (chrom: string) => {
  if (trvCache.has(chrom)) return trvCache.get(chrom)
  const rows = await fetchGroupedTrvVariants(null, chrom)
  const result = createHaplotypeGroupsFromGrouped(
    rows as any[],
    chrom,
    0,
    Number.MAX_SAFE_INTEGER,
    0,
    'similarity_score'
  )
  trvCache.set(chrom, result)
  return result
}

const resolvers = {
  Query: {
    sample_metadata: async (_obj: any, _args: any, ctx: any) => {
      const t0 = now()
      const result = await fetchSampleMetadata(ctx.esClient)
      addTiming(ctx, {
        label: 'sample_metadata',
        ms: now() - t0,
        meta: { rows: (result as any[]).length },
      })
      return result
    },
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
        const minAf = args.min_allele_freq || 0

        const tFetch = now()
        const [groupAssignments, distinctVariants, trvCarriers] = await Promise.all([
          fetchHaplotypeGroupAssignments(chrom, args.start, args.stop, minAf),
          fetchDistinctHaplotypeVariants(chrom, args.start, args.stop),
          fetchTrvCarrierAlts(chrom, args.start, args.stop),
        ])
        const fetchMs = now() - tFetch

        logger.info(`haplotype_groups: fetched ${groupAssignments.length} groups, ${distinctVariants.length} distinct variants, ${trvCarriers.length} TRV carriers for ${chrom}:${args.start}-${args.stop}`)

        const tAssemble = now()
        const result = assembleHaplotypeGroups(
          groupAssignments,
          distinctVariants,
          chrom,
          minAf,
          args.sort_by || 'similarity_score',
          trvCarriers,
          args.cluster_threshold != null ? args.cluster_threshold : undefined,
          args.start,
          args.stop
        )
        const assembleMs = now() - tAssemble

        addTiming(ctx, {
          label: 'haplotype_groups',
          ms: fetchMs + assembleMs,
          meta: {
            ch_grouping_ms: Math.round(fetchMs * 100) / 100,
            ch_variant_ms: Math.round(fetchMs * 100) / 100,
            assembly_ms: Math.round(assembleMs * 100) / 100,
            ch_groups: groupAssignments.length,
            ch_variants: distinctVariants.length,
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
    lr_str_histogram: async (_obj: any, args: any, ctx: any) => {
      const t0 = now()
      const chrom = normalizeChrom(args.chrom)
      const result = await fetchSTRHistogram(ctx.esClient, chrom, args.position)
      addTiming(ctx, {
        label: 'lr_str_histogram',
        ms: now() - t0,
      })
      return result
    },
    str_catalog_haplotypes: async (_obj: any, args: any, ctx: any) => {
      try {
        const chrom = normalizeChrom(args.chrom)
        const t0 = now()
        const result = await fetchTrvHaplotypeGroups(chrom)
        addTiming(ctx, {
          label: 'str_catalog_haplotypes',
          ms: now() - t0,
          meta: { groups: result.groups.length },
        })
        return result
      } catch (e: any) {
        logger.error(`str_catalog_haplotypes error: ${e.message}\n${e.stack}`)
        throw e
      }
    },
    str_catalog: async (_obj: any, args: any, ctx: any) => {
      const t0 = now()
      const chrom = normalizeChrom(args.chrom)
      const rows = await fetchStrCatalog(chrom)
      const result = rows.map((row) => {
        const { motifCount, maxSingleMotifLen } = parseMotifStats(row.tr_motifs)
        return {
          position: Number(row.position),
          chrom,
          trId: row.tr_id || '',
          motifs: row.tr_motifs || '',
          motifCount,
          numHaplotypes: Number(row.total_haplotypes),
          distinctAlleleLengths: Number(row.distinct_lengths),
          minAlleleLen: Number(row.min_alt_len),
          maxAlleleLen: Number(row.max_alt_len),
          sizeRatio: row.size_ratio != null ? Number(row.size_ratio) : null,
          avgPurity: Number(row.avg_purity),
          minPurity: Number(row.min_purity),
          countBelow50Purity: Number(row.count_below_50),
          hasOverlargeSvOutlier: (row.size_ratio ?? 1) > 50,
          hasDeletionBug: Number(row.deletion_bug_count) > 0,
          category: categorizeLocus(row, maxSingleMotifLen),
        }
      })
      addTiming(ctx, {
        label: 'str_catalog',
        ms: now() - t0,
        meta: { loci: result.length },
      })
      return result
    },
  },
}

export default resolvers
