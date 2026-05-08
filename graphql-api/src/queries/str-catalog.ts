import { clickhouseClient } from '../clickhouse'

type StrCatalogRow = {
  position: number
  tr_id: string
  tr_motifs: string
  total_haplotypes: number
  distinct_lengths: number
  min_alt_len: number
  max_alt_len: number
  avg_purity: number
  min_purity: number
  count_below_50: number
  deletion_bug_count: number
  size_ratio: number | null
}

// Motif-derived fields computed in JS since tr_motifs is constant per position
export const parseMotifStats = (trMotifs: string) => {
  const motifs = trMotifs ? trMotifs.split(',').map((m) => m.trim()).filter(Boolean) : []
  const motifCount = motifs.length
  const maxSingleMotifLen = motifs.reduce((max, m) => Math.max(max, m.length), 0)
  return { motifCount, maxSingleMotifLen }
}

export const fetchStrCatalog = async (chrom: string): Promise<StrCatalogRow[]> => {
  const query = `
    SELECT
      position,
      any(tr_id) AS tr_id,
      any(tr_motifs) AS tr_motifs,
      count() AS total_haplotypes,
      countDistinct(length(alt)) AS distinct_lengths,
      min(length(alt)) AS min_alt_len,
      max(length(alt)) AS max_alt_len,
      round(avg(allele_purity), 4) AS avg_purity,
      round(min(allele_purity), 4) AS min_purity,
      countIf(allele_purity < 0.5) AS count_below_50,
      countIf(length(alt) = 1 AND allele_purity IS NOT NULL AND length(ref) > 10) AS deletion_bug_count,
      max(length(alt)) / nullIf(min(length(alt)), 0) AS size_ratio
    FROM lr_haplotypes
    WHERE chrom = {chrom:String} AND allele_type = 'trv'
    GROUP BY position
    HAVING count() > 10
    ORDER BY position
  `
  const resultSet = await clickhouseClient.query({
    query,
    query_params: { chrom },
    format: 'JSONEachRow',
  })
  return resultSet.json() as Promise<StrCatalogRow[]>
}

export type StrQualityCategory =
  | 'CLEAN'
  | 'BORDERLINE'
  | 'LEGIT_BINNED'
  | 'BOGUS_PURITY'
  | 'DEGENERATE_MOTIF'
  | 'SV_CONTAMINATION'
  | 'DELETION_BUG'

export const categorizeLocus = (
  row: StrCatalogRow,
  maxSingleMotifLen: number
): StrQualityCategory => {
  const fractionBelow50 = row.total_haplotypes > 0 ? row.count_below_50 / row.total_haplotypes : 0
  const sizeRatio = row.size_ratio ?? 1

  // BOGUS_PURITY: >80% of haplotypes below 50% purity
  if (fractionBelow50 > 0.8) return 'BOGUS_PURITY'

  // SV_CONTAMINATION: extreme size ratio with high avg purity
  if (sizeRatio > 50 && row.avg_purity > 0.9) return 'SV_CONTAMINATION'

  // DELETION_BUG: has deletion alleles with assigned purity
  if (row.deletion_bug_count > 0) return 'DELETION_BUG'

  // DEGENERATE_MOTIF: short motifs that match random DNA
  if (maxSingleMotifLen <= 3 && row.avg_purity < 0.6) return 'DEGENERATE_MOTIF'

  // LEGIT_BINNED: large alleles appropriate for binned view
  const minMotifLen = maxSingleMotifLen || 1
  if ((row.max_alt_len > 2000 || row.max_alt_len / minMotifLen > 100) && row.avg_purity >= 0.6)
    return 'LEGIT_BINNED'

  // BORDERLINE: moderate purity
  if (row.avg_purity < 0.7) return 'BORDERLINE'

  return 'CLEAN'
}
