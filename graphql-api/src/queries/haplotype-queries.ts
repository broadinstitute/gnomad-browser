import {
  clickhouseClient,
  getSourcePhasedMethylationClickhouseClient,
  getY1AncillaryClickhouseClient,
  isY1PilotEnabled,
  y1ClickhouseClient,
} from '../clickhouse'
import {
  getSourcePhasedMethylationRoute,
  getY1AncillaryRoute,
} from '../graphql/resolvers/ancillary-availability'

/**
 * Fetch haplotype variants pre-grouped by (sample_id, strand) in ClickHouse.
 * Returns ~2 rows per sample instead of one row per variant×sample.
 */
export const fetchGroupedHaplotypeVariants = async (
  _esClient: any,
  chrom: string,
  start: number,
  stop: number
) => {
  const query = `
    SELECT
      sample_id,
      strand AS vcf_strand,
      groupArray(position)  AS positions,
      groupArray(ref)       AS refs,
      groupArray(alt)       AS alts,
      groupArray(rsid)      AS rsids,
      groupArray(info_AF)   AS afs,
      groupArray(info_AC)   AS acs,
      groupArray(info_AN)   AS ans,
      groupArray(allele_type)   AS allele_types,
      groupArray(allele_length) AS allele_lengths,
      groupArray(info_AF_afr)   AS af_afrs,
      groupArray(info_AF_amr)   AS af_amrs,
      groupArray(info_AF_eas)   AS af_eass,
      groupArray(info_AF_nfe)   AS af_nfes,
      groupArray(info_AF_sas)   AS af_sass,
      groupArray(cadd_phred)    AS cadd_phreds,
      groupArray(phylop)        AS phylops,
      groupArray(sv_consequences) AS sv_consequences_arr,
      groupArray(dbsnp_id)      AS dbsnp_ids,
      groupArray(tr_id)         AS tr_ids,
      groupArray(tr_motifs)     AS tr_motifs_arr,
      groupArray(tr_struc)      AS tr_strucs,
      groupArray(allele_methylation) AS allele_methylations,
      groupArray(motif_counts)  AS motif_counts_arr,
      groupArray(allele_purity) AS allele_purities,
      groupArray(short_read_match_id) AS short_read_match_ids,
      groupArray(major_consequence)   AS major_consequences
    FROM lr_haplotypes
    WHERE chrom = {chrom:String} AND position BETWEEN {start:UInt32} AND {stop:UInt32}
    GROUP BY sample_id, strand
    ORDER BY sample_id, strand
  `
  const resultSet = await clickhouseClient.query({
    query,
    query_params: { chrom, start, stop },
    format: 'JSONEachRow',
  })
  return resultSet.json()
}

/**
 * Fetch only TRV (tandem repeat variant) haplotypes across a whole chromosome.
 * Same grouped shape as fetchGroupedHaplotypeVariants but filtered to allele_type = 'trv'.
 */
export const fetchGroupedTrvVariants = async (
  _esClient: any,
  chrom: string,
) => {
  const query = `
    SELECT
      sample_id,
      strand AS vcf_strand,
      groupArray(position)  AS positions,
      groupArray(ref)       AS refs,
      groupArray(alt)       AS alts,
      groupArray(rsid)      AS rsids,
      groupArray(info_AF)   AS afs,
      groupArray(info_AC)   AS acs,
      groupArray(info_AN)   AS ans,
      groupArray(allele_type)   AS allele_types,
      groupArray(allele_length) AS allele_lengths,
      groupArray(info_AF_afr)   AS af_afrs,
      groupArray(info_AF_amr)   AS af_amrs,
      groupArray(info_AF_eas)   AS af_eass,
      groupArray(info_AF_nfe)   AS af_nfes,
      groupArray(info_AF_sas)   AS af_sass,
      groupArray(cadd_phred)    AS cadd_phreds,
      groupArray(phylop)        AS phylops,
      groupArray(sv_consequences) AS sv_consequences_arr,
      groupArray(dbsnp_id)      AS dbsnp_ids,
      groupArray(tr_id)         AS tr_ids,
      groupArray(tr_motifs)     AS tr_motifs_arr,
      groupArray(tr_struc)      AS tr_strucs,
      groupArray(allele_methylation) AS allele_methylations,
      groupArray(motif_counts)  AS motif_counts_arr,
      groupArray(allele_purity) AS allele_purities,
      groupArray(short_read_match_id) AS short_read_match_ids,
      groupArray(major_consequence)   AS major_consequences
    FROM lr_haplotypes
    WHERE chrom = {chrom:String} AND allele_type = 'trv'
    GROUP BY sample_id, strand
    ORDER BY sample_id, strand
  `
  const resultSet = await clickhouseClient.query({
    query,
    query_params: { chrom },
    format: 'JSONEachRow',
  })
  return resultSet.json()
}

/**
 * Query 1: CH-side haplotype grouping.
 * Computes group signatures (sorted variant IDs joined by ';') and returns
 * which (sample_id, strand) pairs share each signature. ~100ms vs ~14s JS-side.
 */
export const fetchHaplotypeGroupAssignments = async (
  chrom: string,
  start: number,
  stop: number,
  minAf: number
) => {
  const query = `
    SELECT
      group_signature AS readable_id,
      groupArray(tuple(sample_id, strand)) AS carriers,
      count() AS sample_count
    FROM (
      SELECT
        sample_id, strand,
        arrayStringConcat(
          arraySort(
            groupArrayIf(
              concat({chrom:String}, '-', toString(position), ':', ref, '-', alt),
              info_AF >= {min_af:Float32}
            )
          ), ';'
        ) AS group_signature
      FROM lr_haplotypes
      WHERE chrom = {chrom:String} AND position BETWEEN {start:UInt32} AND {stop:UInt32}
      GROUP BY sample_id, strand
    )
    WHERE group_signature != ''
    GROUP BY group_signature
    ORDER BY sample_count DESC
  `
  const resultSet = await clickhouseClient.query({
    query,
    query_params: { chrom, start, stop, min_af: minAf },
    format: 'JSONEachRow',
  })
  return resultSet.json() as Promise<
    Array<{
      readable_id: string
      carriers: Array<[string, number]>
      sample_count: string
    }>
  >
}

/**
 * Query 2: Fetch distinct variants (all columns) once per (position, ref, alt),
 * along with which (sample_id, strand) pairs carry each variant.
 * Returns ~1,700 rows instead of ~1,000,000.
 */
export const fetchDistinctHaplotypeVariants = async (
  chrom: string,
  start: number,
  stop: number
) => {
  const query = `
    SELECT
      h.position AS position, h.ref AS ref, h.alt AS alt,
      any(h.rsid) AS rsid,
      any(h.info_AF) AS info_AF,
      any(h.info_AC) AS info_AC,
      any(h.info_AN) AS info_AN,
      any(h.allele_type) AS allele_type,
      any(h.allele_length) AS allele_length,
      any(h.info_AF_afr) AS info_AF_afr,
      any(h.info_AF_amr) AS info_AF_amr,
      any(h.info_AF_eas) AS info_AF_eas,
      any(h.info_AF_nfe) AS info_AF_nfe,
      any(h.info_AF_sas) AS info_AF_sas,
      any(h.cadd_phred) AS cadd_phred,
      any(h.phylop) AS phylop,
      any(h.sv_consequences) AS sv_consequences,
      any(h.dbsnp_id) AS dbsnp_id,
      any(tr_meta.enveloping_tr_id) AS tr_id,
      arrayStringConcat(any(tr_meta.motifs), ',') AS tr_motifs,
      any(tr_meta.gnomad_str) AS tr_struc,
      any(h.allele_methylation) AS allele_methylation,
      any(h.motif_counts) AS motif_counts,
      any(h.allele_purity) AS allele_purity,
      any(h.short_read_match_id) AS short_read_match_id,
      any(h.major_consequence) AS major_consequence,
      groupArray(tuple(h.sample_id, h.strand)) AS carriers
    FROM lr_haplotypes h
    LEFT JOIN (
      SELECT chrom, position, motifs, enveloping_tr_id, gnomad_str
      FROM lr_variants
      WHERE allele_type = 'trv' AND chrom = {chrom:String} AND position BETWEEN {start:UInt32} AND {stop:UInt32}
    ) AS tr_meta
      ON h.chrom = tr_meta.chrom AND h.position = tr_meta.position
    WHERE h.chrom = {chrom:String} AND h.position BETWEEN {start:UInt32} AND {stop:UInt32}
    GROUP BY h.position, h.ref, h.alt
    ORDER BY h.position ASC
  `
  const resultSet = await clickhouseClient.query({
    query,
    query_params: { chrom, start, stop },
    format: 'JSONEachRow',
  })
  return resultSet.json() as Promise<any[]>
}

/**
 * Query 3: Fetch per-carrier alt sequences for TRV (tandem repeat variant) positions only.
 * Returns ~few thousand rows (only TR carriers) vs ~1M total.
 * Used to rebuild per-carrier length distributions in the frontend.
 */
export const fetchTrvCarrierAlts = async (
  chrom: string,
  start: number,
  stop: number
) => {
  const query = `
    SELECT position, ref, alt, sample_id, strand AS vcf_strand
    FROM lr_haplotypes
    WHERE chrom = {chrom:String}
      AND position BETWEEN {start:UInt32} AND {stop:UInt32}
      AND allele_type = 'trv'
  `
  const resultSet = await clickhouseClient.query({
    query,
    query_params: { chrom, start, stop },
    format: 'JSONEachRow',
  })
  return resultSet.json() as Promise<
    Array<{
      position: string
      ref: string
      alt: string
      sample_id: string
      vcf_strand: number
    }>
  >
}

/**
 * Flat per-row fetch — still used by mQTL which needs per-row sample_id + gt_alleles.
 * Trimmed to only the columns mQTL actually needs.
 */
export const fetchHaplotypeVariantsForRegion = async (
  _esClient: any,
  chrom: string,
  start: number,
  stop: number
) => {
  const query = `
    SELECT chrom, position, sample_id, ref, alt, info_AF, gt_alleles
    FROM lr_haplotypes
    WHERE chrom = {chrom:String} AND position BETWEEN {start:UInt32} AND {stop:UInt32}
    ORDER BY position ASC
  `
  const resultSet = await clickhouseClient.query({
    query,
    query_params: { chrom, start, stop },
    format: 'JSONEachRow',
  })
  return resultSet.json()
}

export const fetchY1SampleMetadata = async (metadataRunId: string) => {
  const resultSet = await y1ClickhouseClient.query({
    query: `
      SELECT sample_id, subpopulation, superpopulation
      FROM lr_y1_sample_metadata
      WHERE metadata_run_id = {metadataRunId:String}
        AND release = 'y1' AND cohort = 'hgsvc_hprc' AND reference_genome = 'GRCh38'
      ORDER BY sample_id
    `,
    query_params: { metadataRunId },
    format: 'JSONEachRow',
  })
  return resultSet.json()
}

export const fetchSampleMetadata = async (_esClient: any) => {
  const query = `
    SELECT sample_id, subpopulation, superpopulation
    FROM lr_sample_metadata
    ORDER BY sample_id
  `
  const resultSet = await clickhouseClient.query({
    query,
    format: 'JSONEachRow',
  })
  return resultSet.json()
}

export const fetchLRCoverageForRegion = async (
  _esClient: any,
  chrom: string,
  start: number,
  stop: number,
  cohort: 'hgsvc_hprc' | 'aou' = 'hgsvc_hprc'
) => {
  if (isY1PilotEnabled) {
    if (stop < start || stop - start > 1_000_000) throw new Error('Y1 coverage range is too large')
    const normalizedChrom = chrom.startsWith('chr') ? chrom : `chr${chrom}`
    const route = getY1AncillaryRoute(cohort, 'coverage')
    if (!route) return []
    const resultSet = await getY1AncillaryClickhouseClient(route).query({
      query: `
        SELECT position AS pos, mean, median, over_1, over_5, over_10, over_15,
          over_20, over_25, over_30, over_50, over_100
        FROM lr_y1_coverage
        WHERE chrom = {chrom:String}
          AND position BETWEEN {start:UInt32} AND {stop:UInt32}
          AND ancillary_run_id = {runId:String} AND cohort = {cohort:String}
        ORDER BY position ASC
      `,
      query_params: { runId: route.run_id, cohort, chrom: normalizedChrom, start, stop },
      format: 'JSONEachRow',
    })
    return resultSet.json()
  }
  const resultSet = await clickhouseClient.query({
    query: `
      SELECT * FROM lr_coverage
      WHERE chrom = {chrom:String} AND pos BETWEEN {start:UInt32} AND {stop:UInt32}
      ORDER BY pos ASC
    `,
    query_params: { chrom, start, stop },
    format: 'JSONEachRow',
  })
  return resultSet.json()
}

export const fetchSTRHistogram = async (
  _esClient: any,
  chrom: string,
  position: number,
  cohort: 'hgsvc_hprc' | 'aou' = 'hgsvc_hprc'
) => {
  const route = isY1PilotEnabled ? getY1AncillaryRoute(cohort, 'str_histogram') : null
  if (isY1PilotEnabled && !route) return null
  const strictStrRoute = route?.receipt?.source_format === 'str_completion'
  const y1Position = strictStrRoute ? 'position' : 'source_start'
  const normalizedChrom = isY1PilotEnabled && !chrom.startsWith('chr') ? `chr${chrom}` : chrom
  const query = `
    SELECT chrom, ${isY1PilotEnabled ? `${y1Position} AS position, source_end AS end_position` : 'position, end_position'}, motif,
           allele_size_histogram, biallelic_histogram,
           min_repeats, mode_repeats, mean_repeats, stdev_repeats,
           median_repeats, p99_repeats, max_repeats,
           unique_allele_lengths, num_called_alleles,
           populations
    FROM ${isY1PilotEnabled ? 'lr_y1_str_histograms' : 'lr_str_histograms'}
    WHERE ${isY1PilotEnabled ? 'ancillary_run_id = {runId:String} AND cohort = {cohort:String} AND ' : ''}
      chrom = {chrom:String} AND ${isY1PilotEnabled ? y1Position : 'position'} = {position:UInt32}
    LIMIT 2
  `
  const resultSet = await (route ? getY1AncillaryClickhouseClient(route) : clickhouseClient).query({
    query,
    query_params: { runId: route?.run_id, cohort, chrom: normalizedChrom, position },
    format: 'JSONEachRow',
  })
  const rows = (await resultSet.json()) as any[]
  if (rows.length === 0) return null
  if (rows.length > 1) throw new Error(`STR histogram invariant failure at ${chrom}:${position}`)

  const row = rows[0]
  // Convert populations Map to array of {key, histogram} objects
  const populations = row.populations
    ? Object.entries(row.populations).map(([key, histogram]) => ({ key, histogram }))
    : []

  return { ...row, populations }
}

export const fetchMethylationSummaryForRegion = async (
  _esClient: any,
  chrom: string,
  start: number,
  stop: number,
  cohort: 'hgsvc_hprc' | 'aou' = 'hgsvc_hprc'
) => {
  if (isY1PilotEnabled) {
    if (stop < start || stop - start > 1_000_000) throw new Error('Y1 methylation range is too large')
    const route = getY1AncillaryRoute(cohort, 'methylation')
    if (!route) return []
    const resultSet = await getY1AncillaryClickhouseClient(route).query({
      query: `
        SELECT chrom, pos1, pos2, mean_methylation, mean_coverage, num_samples,
          std_methylation, min_methylation, max_methylation
        FROM lr_methylation_summary
        WHERE chrom = {chrom:String} AND pos1 BETWEEN {start:UInt32} AND {stop:UInt32}
          AND 1 = (
            SELECT count() FROM lr_methylation_cohort_availability
            WHERE ancillary_run_id = {runId:String} AND cohort = {cohort:String}
              AND availability = 'available_sample_total'
          )
        ORDER BY pos1 ASC
      `,
      query_params: { runId: route.run_id, cohort, chrom, start, stop },
      format: 'JSONEachRow',
    })
    return resultSet.json()
  }
  const resultSet = await clickhouseClient.query({
    query: `
      SELECT {chrom:String} AS chrom, pos1, pos2,
             avgMerge(mean_methylation_state) AS mean_methylation,
             avgMerge(mean_coverage_state) AS mean_coverage,
             countMerge(num_samples_state) AS num_samples,
             sqrt(varPopMerge(var_methylation_state)) AS std_methylation
      FROM lr_methylation_summary_mv
      WHERE chrom = {chrom:String} AND pos1 BETWEEN {start:UInt32} AND {stop:UInt32}
      GROUP BY pos1, pos2
      ORDER BY pos1 ASC
    `,
    query_params: { chrom, start, stop },
    format: 'JSONEachRow',
  })
  return resultSet.json()
}

export const fetchMethylationOutliersForRegion = async (
  _esClient: any,
  chrom: string,
  start: number,
  stop: number,
  cohort: 'hgsvc_hprc' | 'aou' = 'hgsvc_hprc'
) => {
  if (isY1PilotEnabled && (stop < start || stop - start > 1_000_000)) {
    throw new Error('Y1 methylation range is too large')
  }
  const route = isY1PilotEnabled ? getY1AncillaryRoute(cohort, 'methylation') : null
  if (isY1PilotEnabled && !route) return null
  const summaryQuery = isY1PilotEnabled ? `
        SELECT chrom, pos1, pos2, mean_methylation AS site_mean,
               std_methylation AS site_std
        FROM lr_methylation_summary
        WHERE chrom = {chrom:String} AND pos1 BETWEEN {start:UInt32} AND {stop:UInt32}
  ` : `
        SELECT chrom, pos1, pos2,
               avgMerge(mean_methylation_state) AS site_mean,
               sqrt(varPopMerge(var_methylation_state)) AS site_std
        FROM lr_methylation_summary_mv
        WHERE chrom = {chrom:String} AND pos1 BETWEEN {start:UInt32} AND {stop:UInt32}
        GROUP BY chrom, pos1, pos2
  `
  const query = `
    SELECT sample_id,
           countIf(abs(methylation - site_mean) > 2 * site_std) AS outlier_count,
           count() AS total_sites,
           'mixed' AS direction
    FROM lr_methylation AS detail
    JOIN (${summaryQuery}) AS stats
      ON detail.chrom = stats.chrom AND detail.pos1 = stats.pos1 AND detail.pos2 = stats.pos2
    WHERE detail.chrom = {chrom:String}
      AND detail.pos1 BETWEEN {start:UInt32} AND {stop:UInt32}
      ${isY1PilotEnabled ? `AND 1 = (
        SELECT count() FROM lr_methylation_cohort_availability
        WHERE ancillary_run_id = {runId:String} AND cohort = {cohort:String}
          AND availability = 'available_sample_total'
      )` : ''}
    GROUP BY sample_id
    ORDER BY outlier_count DESC
  `
  const resultSet = await (route ? getY1AncillaryClickhouseClient(route) : clickhouseClient).query({
    query,
    query_params: { runId: route?.run_id, cohort, chrom, start, stop },
    format: 'JSONEachRow',
  })
  const samples = (await resultSet.json()) as any[]

  if (!samples.length) return null

  return {
    chrom,
    start,
    stop,
    total_cpg_sites: samples[0]?.total_sites || 0,
    total_samples: samples.length,
    samples: samples.map((s) => ({
      sample_id: s.sample_id,
      outlier_count: Number(s.outlier_count),
      outlier_fraction: Number(s.outlier_count) / Number(s.total_sites),
      direction: s.direction,
    })),
  }
}

export const fetchSourcePhasedMethylationForEvaluation = async (
  chrom: string,
  start: number,
  stop: number,
  sampleId: string
) => {
  const route = getSourcePhasedMethylationRoute()
  if (!route) return []
  const result = await getSourcePhasedMethylationClickhouseClient(route).query({
    query: `
      SELECT chrom AS chr, pos1, pos2, methylation, sample_id AS sample,
        coverage, source_haplotype
      FROM lr_y1_methylation_source_haplotype_presentation
      WHERE chrom = {chrom:String}
        AND pos1 BETWEEN {start:UInt32} AND {stop:UInt32}
        AND sample_id = {sampleId:String}
        AND source_haplotype IN (1, 2)
      ORDER BY pos1, source_haplotype
    `,
    query_params: { chrom, start, stop, sampleId },
    format: 'JSONEachRow',
  })
  return result.json()
}

export const fetchMethylationForRegion = async (
  _esClient: any,
  chrom: string,
  start: number,
  stop: number,
  samples?: string[],
  cohort: 'hgsvc_hprc' | 'aou' = 'hgsvc_hprc'
) => {
  const route = isY1PilotEnabled ? getY1AncillaryRoute(cohort, 'methylation') : null
  if (isY1PilotEnabled && !route) return []
  if (isY1PilotEnabled && (stop < start || stop - start > 1_000_000)) {
    throw new Error('Y1 methylation range is too large')
  }
  if (samples && samples.length > 500) throw new Error('Too many methylation samples requested')
  let query = ''
  const query_params: any = { runId: route?.run_id, cohort, chrom, start, stop }

  if (samples && samples.length > 0) {
    query = `
      SELECT chrom AS chr, pos1, pos2, methylation, coverage, sample_id AS sample
      FROM lr_methylation
      WHERE chrom = {chrom:String}
        AND pos1 BETWEEN {start:UInt32} AND {stop:UInt32}
        ${isY1PilotEnabled ? `AND 1 = (
          SELECT count() FROM lr_methylation_cohort_availability
          WHERE ancillary_run_id = {runId:String} AND cohort = {cohort:String}
            AND availability = 'available_sample_total'
        )` : ''}
        AND sample_id IN ({samples:Array(String)})
    `
    query_params.samples = samples
  } else if (!samples) {
    query = `
      SELECT chrom AS chr, pos1, pos2, methylation, coverage, sample_id AS sample
      FROM lr_methylation
      WHERE chrom = {chrom:String}
        AND pos1 BETWEEN {start:UInt32} AND {stop:UInt32}
        ${isY1PilotEnabled ? `AND 1 = (
          SELECT count() FROM lr_methylation_cohort_availability
          WHERE ancillary_run_id = {runId:String} AND cohort = {cohort:String}
            AND availability = 'available_sample_total'
        )` : ''}
    `
  } else {
    return []
  }

  const resultSet = await (route ? getY1AncillaryClickhouseClient(route) : clickhouseClient).query({
    query,
    query_params,
    format: 'JSONEachRow',
  })
  return resultSet.json()
}
