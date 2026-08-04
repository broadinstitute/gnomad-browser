import { fetchMQTLAssociations } from '../../queries/mqtl-queries'
import {
  fetchGroupedTrvVariants,
  fetchHaplotypeGroupAssignments,
  fetchDistinctHaplotypeVariants,
  fetchTrvCarrierAlts,
  fetchSampleMetadata,
  fetchY1SampleMetadata,
  fetchMethylationForRegion,
  fetchSourcePhasedMethylationForEvaluation,
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
import {
  ancillaryDecision,
  filterAvailableMethylationSampleIds,
  getSourcePhasedMethylationRoute,
  getY1AncillaryRoute,
  isAncillaryUnavailableForCohort,
  methylationSampleAvailability,
  phasedMethylationCapability,
  sampleTotalMethylationRecords,
  sourcePhasedEvaluationScope,
  sourcePhasedMethylationRecords,
} from './ancillary-availability'
import { isY1PilotEnabled } from '../../clickhouse'
import { getY1SourceSnapshot } from '../../queries/long_read_y1_provenance'

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
    return null
  }
}

const fetchRecombinationRate = withCache(
  _fetchRecombinationRate,
  (chrom: string, start: number, stop: number) =>
    `recombination:y1=${isY1PilotEnabled}:hg38:recomb1000GAvg:${chrom}:${start}:${stop}`,
  { expiration: 86400 }
)

const normalizeChrom = (chrom: string) =>
  chrom.startsWith('chr') ? chrom : `chr${chrom}`

const y1RequestInScope = async (cohort: 'hgsvc_hprc' | 'aou', chrom: string) => {
  if (!isY1PilotEnabled) return true
  const source = await getY1SourceSnapshot(cohort, chrom)
  return !!source
}

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
    sample_metadata: async (_obj: any, args: any, ctx: any) => {
      const t0 = now()
      if (isY1PilotEnabled) {
        if (args.lr_cohort === 'aou') return null
        const source = await getY1SourceSnapshot('hgsvc_hprc')
        if (!source?.metadata_run_id) return null
        const result = await fetchY1SampleMetadata(source.metadata_run_id)
        addTiming(ctx, {
          label: 'sample_metadata', ms: now() - t0,
          meta: { rows: (result as any[]).length, run_id: source.metadata_run_id },
        })
        return result
      }
      const result = await fetchSampleMetadata(ctx.esClient)
      addTiming(ctx, {
        label: 'sample_metadata',
        ms: now() - t0,
        meta: { rows: (result as any[]).length },
      })
      return result
    },
    mqtl_associations: async (_obj: any, args: any, ctx: any) => {
      if (isY1PilotEnabled) return null
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
      if (isY1PilotEnabled) return null
      try {
        const chrom = normalizeChrom(args.chrom)
        const minAf = args.min_allele_freq ?? 0

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
          args.stop,
          `legacy:prototype=false:hgsvc_hprc:no-run`
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
    methylation_sample_availability: (_obj: any, args: any) =>
      methylationSampleAvailability(args.lr_cohort),
    phased_methylation_capability: (_obj: any, args: any) =>
      phasedMethylationCapability(args.lr_cohort),
    source_phased_methylation: async (_obj: any, args: any, ctx: any) => {
      const capability = phasedMethylationCapability(args.lr_cohort)
      if (!capability.available || args.lr_cohort === 'aou') return null
      if (!await y1RequestInScope('hgsvc_hprc', args.chrom)) return null
      const scope = sourcePhasedEvaluationScope(
        args.chrom, args.start, args.stop, args.sample_id
      )
      const t0 = now()
      const result = await fetchSourcePhasedMethylationForEvaluation(
        scope.chrom, scope.start, scope.stop, scope.sample_id
      )
      addTiming(ctx, {
        label: 'source_phased_methylation',
        ms: now() - t0,
        meta: { rows: (result as any[]).length, sample: scope.sample_id },
      })
      return sourcePhasedMethylationRecords(result as any[])
    },
    methylation: async (_obj: any, args: any, ctx: any) => {
      if (!await y1RequestInScope(args.lr_cohort, args.chrom)) return null
      if (isAncillaryUnavailableForCohort(args.lr_cohort, undefined, 'methylation')) return null
      const t0 = now()
      const chrom = normalizeChrom(args.chrom)
      const requestedSamples = isY1PilotEnabled
        ? filterAvailableMethylationSampleIds(args.samples, methylationSampleAvailability(args.lr_cohort))
        : args.samples
      const result = await fetchMethylationForRegion(
        ctx.esClient, chrom, args.start, args.stop, requestedSamples, args.lr_cohort
      )
      addTiming(ctx, {
        label: 'methylation',
        ms: now() - t0,
        meta: { rows: (result as any[]).length },
      })
      // The compatibility endpoint serves combined/sample-total rows only. In
      // particular, it never maps source hap1/hap2 to a VCF GT position.
      return sampleTotalMethylationRecords(result as any[])
    },
    methylation_summary: async (_obj: any, args: any, ctx: any) => {
      if (!await y1RequestInScope(args.lr_cohort, args.chrom)) return null
      if (isAncillaryUnavailableForCohort(args.lr_cohort, undefined, 'methylation')) return null
      const t0 = now()
      const chrom = normalizeChrom(args.chrom)
      const result = await fetchMethylationSummaryForRegion(
        ctx.esClient, chrom, args.start, args.stop, args.lr_cohort
      )
      addTiming(ctx, {
        label: 'methylation_summary',
        ms: now() - t0,
        meta: { rows: (result as any[]).length },
      })
      return result
    },
    methylation_outliers: async (_obj: any, args: any, ctx: any) => {
      if (!await y1RequestInScope(args.lr_cohort, args.chrom)) return null
      if (isAncillaryUnavailableForCohort(args.lr_cohort, undefined, 'methylation')) return null
      const t0 = now()
      const chrom = normalizeChrom(args.chrom)
      const result = await fetchMethylationOutliersForRegion(
        ctx.esClient, chrom, args.start, args.stop, args.lr_cohort
      )
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
        meta: { rows: result?.length ?? 0 },
      })
      return result
    },
    lr_coverage: async (_obj: any, args: any, ctx: any) => {
      if (!await y1RequestInScope(args.lr_cohort, args.chrom)) return null
      if (isAncillaryUnavailableForCohort(args.lr_cohort, undefined, 'coverage')) return null
      const t0 = now()
      const chrom = normalizeChrom(args.chrom)
      const result = await fetchLRCoverageForRegion(
        ctx.esClient, chrom, args.start, args.stop, args.lr_cohort
      )
      addTiming(ctx, {
        label: 'lr_coverage',
        ms: now() - t0,
        meta: { rows: (result as any[]).length },
      })
      return result
    },
    lr_str_histogram: async (_obj: any, args: any, ctx: any) => {
      if (!await y1RequestInScope(args.lr_cohort, args.chrom)) return null
      if (isAncillaryUnavailableForCohort(args.lr_cohort, undefined, 'str_histogram')) return null
      const t0 = now()
      const chrom = normalizeChrom(args.chrom)
      const result = await fetchSTRHistogram(ctx.esClient, chrom, args.position, args.lr_cohort)
      addTiming(ctx, {
        label: 'lr_str_histogram',
        ms: now() - t0,
      })
      return result
    },
    long_read_y1_provenance: async (_obj: any, args: any) => {
      const chrom = normalizeChrom(args.chrom)
      const cohort = args.lr_cohort as 'hgsvc_hprc' | 'aou'
      const configured = isY1PilotEnabled ? await getY1SourceSnapshot(cohort, chrom) : null
      const primary = configured
      const acceptedLabel = primary
        ? `Accepted Y1 — database=${primary.database}; cohort=${primary.cohort}; run=${primary.run_id}; ` +
          `scope=${primary.release}/${primary.reference_genome}/${primary.chrom}/${primary.load_scope}; state=${primary.state}`
        : null
      const metadataAvailable = cohort === 'hgsvc_hprc' && !!primary?.metadata_run_id
      const sources = [
        {
          modality: 'PRIMARY_VARIANTS', source: primary ? 'Y1_ACCEPTED' : 'UNAVAILABLE',
          database: configured?.database || null, release: configured?.release || null,
          cohort, reference_genome: configured?.reference_genome || 'GRCh38', chromosome: chrom,
          scope: configured?.load_scope || null, run_id: configured?.run_id || null,
          available: !!primary, status: primary?.state || 'unavailable',
          label: acceptedLabel || (configured ? `Unavailable outside ${configured.chrom}` : 'Cohort unavailable'),
        },
        {
          modality: 'HAPLOTYPES',
          source: primary?.carriers_available ? 'Y1_ACCEPTED' : 'UNAVAILABLE',
          database: configured?.database || null, release: configured?.release || null,
          cohort, reference_genome: configured?.reference_genome || 'GRCh38', chromosome: chrom,
          scope: configured?.load_scope || null, run_id: configured?.run_id || null,
          available: !!primary?.carriers_available,
          status: primary?.carriers_available ? primary.state : 'unavailable',
          label: cohort === 'aou' ? 'AoU is summary-only' : (acceptedLabel || 'Cohort or scope unavailable'),
        },
        {
          modality: 'SAMPLE_METADATA', source: metadataAvailable ? 'Y1_DATABASE' : 'UNAVAILABLE',
          database: configured?.database || null, release: metadataAvailable ? 'y1' : null,
          cohort, reference_genome: configured?.reference_genome || 'GRCh38', chromosome: chrom,
          scope: configured?.load_scope || null, run_id: primary?.metadata_run_id || null,
          available: metadataAvailable, status: metadataAvailable ? 'accepted' : 'unavailable',
          label: metadataAvailable ? 'Accepted Y1 metadata in configured database' : 'Optional metadata unavailable',
        },
        ...(['coverage', 'methylation', 'str_histogram'] as const).map((modality) => {
          const decision = ancillaryDecision(cohort, modality)
          const route = getY1AncillaryRoute(cohort, modality)
          const available = !!primary && decision.available && !!route
          return {
            modality: {
              coverage: 'COVERAGE', methylation: 'METHYLATION', str_histogram: 'STR_HISTOGRAM',
            }[modality],
            source: available ? decision.source : 'UNAVAILABLE',
            database: route?.database || null, release: available ? 'y1' : null, cohort,
            reference_genome: configured?.reference_genome || 'GRCh38', chromosome: chrom,
            scope: available ? 'full_genome' : null, run_id: route?.run_id || null,
            available, status: available ? 'available' : 'unavailable',
            label: available ? 'Optional ancillary table in configured Y1 database' : (decision.reason || 'Unavailable'),
          }
        }),
        (() => {
          const route = getSourcePhasedMethylationRoute()
          const capability = phasedMethylationCapability(cohort)
          const available = !!primary && capability.available && !!route
          return {
            modality: 'SOURCE_PHASED_METHYLATION',
            source: available ? 'Y1_DATABASE' : 'UNAVAILABLE',
            database: route?.database || null,
            release: available ? 'y1' : null,
            cohort,
            reference_genome: configured?.reference_genome || 'GRCh38',
            chromosome: chrom,
            scope: available ? 'full_genome_source_labelled_only' : null,
            run_id: route?.run_id || null,
            available,
            status: available ? 'available_orientation_unconfirmed' : 'unavailable',
            label: available
              ? 'Source-labelled hap1/hap2 methylation; not joined to VCF GT sides or phase blocks'
              : capability.reason,
          }
        })(),
        {
          modality: 'RECOMBINATION', source: 'EXTERNAL_REFERENCE', database: null,
          release: null, cohort, reference_genome: 'GRCh38', chromosome: chrom,
          scope: null, run_id: null, available: true, status: 'available',
          label: 'External reference (UCSC hg38 recomb1000GAvg)',
        },
      ]
      return {
        enabled: isY1PilotEnabled,
        scope_label: configured
          ? `${configured.database}: ${configured.chrom} (${configured.load_scope})`
          : 'Y1 cohort unavailable',
        sources,
      }
    },
    str_catalog_haplotypes: async (_obj: any, args: any, ctx: any) => {
      if (isY1PilotEnabled) return null
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
      if (isY1PilotEnabled) return null
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
