import { clickhouseClient } from '../clickhouse'

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
      strand,
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
      groupArray(dbgap_id)      AS dbgap_ids,
      groupArray(tr_id)         AS tr_ids,
      groupArray(tr_motifs)     AS tr_motifs_arr,
      groupArray(tr_struc)      AS tr_strucs,
      groupArray(allele_methylation) AS allele_methylations,
      groupArray(motif_counts)  AS motif_counts_arr,
      groupArray(allele_purity) AS allele_purities
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
      strand,
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
      groupArray(dbgap_id)      AS dbgap_ids,
      groupArray(tr_id)         AS tr_ids,
      groupArray(tr_motifs)     AS tr_motifs_arr,
      groupArray(tr_struc)      AS tr_strucs,
      groupArray(allele_methylation) AS allele_methylations,
      groupArray(motif_counts)  AS motif_counts_arr,
      groupArray(allele_purity) AS allele_purities
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
      position, ref, alt,
      any(rsid) AS rsid,
      any(info_AF) AS info_AF,
      any(info_AC) AS info_AC,
      any(info_AN) AS info_AN,
      any(allele_type) AS allele_type,
      any(allele_length) AS allele_length,
      any(info_AF_afr) AS info_AF_afr,
      any(info_AF_amr) AS info_AF_amr,
      any(info_AF_eas) AS info_AF_eas,
      any(info_AF_nfe) AS info_AF_nfe,
      any(info_AF_sas) AS info_AF_sas,
      any(cadd_phred) AS cadd_phred,
      any(phylop) AS phylop,
      any(sv_consequences) AS sv_consequences,
      any(dbgap_id) AS dbgap_id,
      any(tr_id) AS tr_id,
      any(tr_motifs) AS tr_motifs,
      any(tr_struc) AS tr_struc,
      any(allele_methylation) AS allele_methylation,
      any(motif_counts) AS motif_counts,
      any(allele_purity) AS allele_purity,
      groupArray(tuple(sample_id, strand)) AS carriers
    FROM lr_haplotypes
    WHERE chrom = {chrom:String} AND position BETWEEN {start:UInt32} AND {stop:UInt32}
    GROUP BY position, ref, alt
    ORDER BY position ASC
  `
  const resultSet = await clickhouseClient.query({
    query,
    query_params: { chrom, start, stop },
    format: 'JSONEachRow',
  })
  return resultSet.json() as Promise<any[]>
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
  stop: number
) => {
  const query = `
    SELECT * FROM lr_coverage
    WHERE chrom = {chrom:String} AND pos BETWEEN {start:UInt32} AND {stop:UInt32}
    ORDER BY pos ASC
  `
  const resultSet = await clickhouseClient.query({
    query,
    query_params: { chrom, start, stop },
    format: 'JSONEachRow',
  })
  return resultSet.json()
}

export const fetchSTRHistogram = async (
  _esClient: any,
  chrom: string,
  position: number
) => {
  const query = `
    SELECT chrom, position, end_position, motif,
           allele_size_histogram, biallelic_histogram,
           min_repeats, mode_repeats, mean_repeats, stdev_repeats,
           median_repeats, p99_repeats, max_repeats,
           unique_allele_lengths, num_called_alleles,
           populations
    FROM lr_str_histograms
    WHERE chrom = {chrom:String} AND position = {position:UInt32}
    LIMIT 1
  `
  const resultSet = await clickhouseClient.query({
    query,
    query_params: { chrom, position },
    format: 'JSONEachRow',
  })
  const rows = (await resultSet.json()) as any[]
  if (rows.length === 0) return null

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
  stop: number
) => {
  const query = `
    SELECT {chrom:String} AS chrom, pos1, pos2,
           avgMerge(mean_methylation_state) AS mean_methylation,
           avgMerge(mean_coverage_state) AS mean_coverage,
           countMerge(num_samples_state) AS num_samples,
           sqrt(varPopMerge(var_methylation_state)) AS std_methylation
    FROM lr_methylation_summary_mv
    WHERE chrom = {chrom:String} AND pos1 BETWEEN {start:UInt32} AND {stop:UInt32}
    GROUP BY pos1, pos2
    ORDER BY pos1 ASC
  `
  const resultSet = await clickhouseClient.query({
    query,
    query_params: { chrom, start, stop },
    format: 'JSONEachRow',
  })
  return resultSet.json()
}

export const fetchMethylationOutliersForRegion = async (
  _esClient: any,
  chrom: string,
  start: number,
  stop: number
) => {
  const query = `
    SELECT sample_id,
           countIf(abs(methylation - site_mean) > 2 * site_std) AS outlier_count,
           count() AS total_sites,
           'mixed' AS direction
    FROM lr_methylation
    JOIN (
        SELECT pos1,
               avgMerge(mean_methylation_state) AS site_mean,
               sqrt(varPopMerge(var_methylation_state)) AS site_std
        FROM lr_methylation_summary_mv
        WHERE chrom = {chrom:String} AND pos1 BETWEEN {start:UInt32} AND {stop:UInt32}
        GROUP BY pos1
    ) AS stats USING pos1
    WHERE chrom = {chrom:String} AND pos1 BETWEEN {start:UInt32} AND {stop:UInt32}
    GROUP BY sample_id
    ORDER BY outlier_count DESC
  `
  const resultSet = await clickhouseClient.query({
    query,
    query_params: { chrom, start, stop },
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

export const fetchMethylationForRegion = async (
  _esClient: any,
  chrom: string,
  start: number,
  stop: number,
  samples?: string[]
) => {
  let query = ''
  let query_params: any = { chrom, start, stop }

  if (samples && samples.length > 0) {
    query = `
      SELECT chrom AS chr, pos1, pos2, methylation, coverage, sample_id AS sample
      FROM lr_methylation
      WHERE chrom = {chrom:String}
        AND pos1 BETWEEN {start:UInt32} AND {stop:UInt32}
        AND sample_id IN ({samples:Array(String)})
    `
    query_params.samples = samples
  } else if (!samples) {
    // If undefined is explicitly passed, fetch all samples in the region for mQTL
    query = `
      SELECT chrom AS chr, pos1, pos2, methylation, coverage, sample_id AS sample
      FROM lr_methylation
      WHERE chrom = {chrom:String}
        AND pos1 BETWEEN {start:UInt32} AND {stop:UInt32}
    `
  } else {
    return [] // samples is explicitly an empty array
  }

  const resultSet = await clickhouseClient.query({
    query,
    query_params,
    format: 'JSONEachRow',
  })
  return resultSet.json()
}
