import { fetchMQTLAssociations } from '../../queries/mqtl-queries'
import {
  fetchGroupedHaplotypeVariants,
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
  isAncillaryUnavailableForCohort,
  methylationSampleAvailability,
  phasedMethylationCapability,
  prototypeAncillaryCapabilities,
  sampleTotalMethylationRecords,
  sourcePhasedEvaluationScope,
  sourcePhasedMethylationRecords,
} from './ancillary-availability'
import {
  isY1Chr22MixedProvenanceEnabled,
  isY1PilotEnabled,
} from '../../clickhouse'
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
    `recombination:prototype=${isY1Chr22MixedProvenanceEnabled}:hg38:recomb1000GAvg:${chrom}:${start}:${stop}`,
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
    sample_metadata: async (_obj: any, args: any, ctx: any) => {
      const t0 = now()
      if (isY1PilotEnabled) {
        if (args.lr_cohort === 'aou') return null
        const source = await getY1SourceSnapshot('hgsvc_hprc')
        if (!source.metadata_run_id) return null
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
      const scope = sourcePhasedEvaluationScope(args.chrom, args.start, args.stop)
      const t0 = now()
      const result = await fetchSourcePhasedMethylationForEvaluation(
        scope.chrom, scope.start, scope.stop
      )
      addTiming(ctx, {
        label: 'source_phased_methylation',
        ms: now() - t0,
        meta: { rows: (result as any[]).length, sample: scope.sample_id },
      })
      return sourcePhasedMethylationRecords(result as any[])
    },
    methylation: async (_obj: any, args: any, ctx: any) => {
      if (normalizeChrom(args.chrom) !== 'chr22' && isY1Chr22MixedProvenanceEnabled) return null
      if (isAncillaryUnavailableForCohort(args.lr_cohort, undefined, undefined, 'methylation')) return null
      const t0 = now()
      const chrom = normalizeChrom(args.chrom)
      const requestedSamples = isY1Chr22MixedProvenanceEnabled
        ? filterAvailableMethylationSampleIds(args.samples, methylationSampleAvailability(args.lr_cohort))
        : args.samples
      const result = await fetchMethylationForRegion(ctx.esClient, chrom, args.start, args.stop, requestedSamples)
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
      if (normalizeChrom(args.chrom) !== 'chr22' && isY1Chr22MixedProvenanceEnabled) return null
      if (isAncillaryUnavailableForCohort(args.lr_cohort, undefined, undefined, 'methylation')) return null
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
      if (normalizeChrom(args.chrom) !== 'chr22' && isY1Chr22MixedProvenanceEnabled) return null
      if (isAncillaryUnavailableForCohort(args.lr_cohort, undefined, undefined, 'methylation')) return null
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
        meta: { rows: result?.length ?? 0 },
      })
      return result
    },
    lr_coverage: async (_obj: any, args: any, ctx: any) => {
      if (normalizeChrom(args.chrom) !== 'chr22' && isY1Chr22MixedProvenanceEnabled) return null
      if (isAncillaryUnavailableForCohort(args.lr_cohort, undefined, undefined, 'coverage')) return null
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
      if (normalizeChrom(args.chrom) !== 'chr22' && isY1Chr22MixedProvenanceEnabled) return null
      if (isAncillaryUnavailableForCohort(args.lr_cohort, undefined, undefined, 'str_histogram')) return null
      const t0 = now()
      const chrom = normalizeChrom(args.chrom)
      const result = await fetchSTRHistogram(ctx.esClient, chrom, args.position)
      addTiming(ctx, {
        label: 'lr_str_histogram',
        ms: now() - t0,
      })
      return result
    },
    long_read_prototype_provenance: async (_obj: any, args: any) => {
      const chrom = normalizeChrom(args.chrom)
      const cohort = args.lr_cohort
      const inScope = chrom === 'chr22'
      const primary = isY1PilotEnabled && inScope
        ? await getY1SourceSnapshot(cohort)
        : null
      const metadataAvailable = cohort === 'hgsvc_hprc' && !!primary?.metadata_run_id
      const ancillary = prototypeAncillaryCapabilities()
      const sources = [
        {
          modality: 'PRIMARY_VARIANTS', source: primary ? 'Y1_ACCEPTED_R2' : 'UNAVAILABLE',
          release: primary?.release || null, cohort, reference_genome: 'GRCh38', chromosome: chrom,
          run_id: primary?.run_id || null, available: !!primary, status: primary ? 'accepted' : 'unavailable',
          label: primary ? 'gnomAD LR Y1 accepted r2' : 'Unavailable outside chr22',
        },
        {
          modality: 'HAPLOTYPES', source: primary && cohort === 'hgsvc_hprc' ? 'Y1_ACCEPTED_R2' : 'UNAVAILABLE',
          release: primary?.release || null, cohort, reference_genome: 'GRCh38', chromosome: chrom,
          run_id: primary?.run_id || null, available: !!primary && cohort === 'hgsvc_hprc',
          status: primary && cohort === 'hgsvc_hprc' ? 'accepted' : 'unavailable',
          label: cohort === 'aou' ? 'AoU is summary-only' : 'gnomAD LR Y1 accepted r2',
        },
        {
          modality: 'SAMPLE_METADATA', source: metadataAvailable ? 'Y1_ACCEPTED_R2' : 'UNAVAILABLE',
          release: metadataAvailable ? 'y1' : null, cohort, reference_genome: 'GRCh38', chromosome: chrom,
          run_id: primary?.metadata_run_id || null, available: metadataAvailable,
          status: metadataAvailable ? 'accepted' : 'unavailable',
          label: metadataAvailable ? 'Accepted Y1 metadata' : 'Unavailable',
        },
        ...(['coverage', 'methylation', 'str_histogram'] as const).map((modality) => {
          const decision = ancillaryDecision(cohort, modality)
          const prototypeLabels = {
            coverage: 'HGSVC/HPRC v2 aggregate coverage prototype — 50,818,468 chr22 rows; not Y1 accepted',
            methylation: 'Pinned CpG mixed-provenance prototype — exactly 210 available samples; 82 explicitly unavailable',
            str_histogram: 'Legacy v2 STR prototype — 35,005 exact Y1 TR-key mappings; histogram payload not scientifically accepted',
          }
          const prototypeReceipts = {
            coverage: 'hgsvc-hprc-v2-coverage-chr22-prototype',
            methylation: 'pinned-pb-cpg-tools-chr22-210-sample-prototype',
            str_histogram: 'legacy-default-lr-str-histograms-chr22-exact-y1-tr-key-20260728',
          }
          return {
            modality: modality === 'coverage' ? 'COVERAGE' : modality === 'methylation' ? 'METHYLATION' : 'STR_HISTOGRAM',
            source: inScope ? decision.source : 'UNAVAILABLE',
            release: inScope && decision.available ? 'mixed-prototype' : null,
            cohort, reference_genome: 'GRCh38', chromosome: chrom,
            run_id: inScope && decision.available ? prototypeReceipts[modality] : null,
            available: inScope && decision.available, status: inScope && decision.available ? 'prototype' : 'unavailable',
            label: inScope && decision.available
              ? prototypeLabels[modality]
              : inScope ? decision.reason : 'Unavailable outside chr22',
          }
        }),
        {
          modality: 'RECOMBINATION', source: inScope ? 'EXTERNAL_REFERENCE' : 'UNAVAILABLE', release: null, cohort,
          reference_genome: 'GRCh38', chromosome: chrom, run_id: null, available: inScope,
          status: inScope ? 'prototype' : 'unavailable',
          label: inScope ? 'External reference (UCSC hg38 recomb1000GAvg)' : 'Unavailable outside chr22',
        },
      ]
      return {
        enabled: isY1Chr22MixedProvenanceEnabled,
        mixed_provenance: isY1Chr22MixedProvenanceEnabled,
        scope_label: 'Non-production chr22 mixed-provenance prototype',
        warning: 'Variants and HGSVC haplotypes are accepted Y1 r2; ancillary tracks are isolated mixed-provenance prototypes, not Y1 accepted. AoU is summary-only. Unavailable values are not zero.',
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
