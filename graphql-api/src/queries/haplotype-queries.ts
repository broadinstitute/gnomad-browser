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
      groupArray(info_AN)   AS ans
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
