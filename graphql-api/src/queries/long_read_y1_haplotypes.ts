import { y1ClickhouseClient } from '../clickhouse'
import { browserVariantId } from './long_read_y1_variants'

// Unphased heterozygous/partial ALT calls cannot be assigned to haplotype 1 or 2.
// Phased, haploid, and unphased homozygous-alt calls have deterministic placement.
const deterministicCarrier = `
  c.gt_phased = 1
  OR length(c.gt_alleles) = 1
  OR (
    length(c.gt_alleles) > 1
    AND arrayAll(allele -> ifNull(allele = c.alt_index, false), c.gt_alleles)
  )
`

export type Y1PhaseSummary = {
  total_carrier_rows: number
  phased_rows: number
  haploid_rows: number
  unphased_homozygous_alt_rows: number
  ambiguous_unphased_rows: number
}

export const fetchY1HaplotypeRows = async (
  chrom: string,
  start: number,
  stop: number,
  runId: string
) => {
  const queryParams = { runId, chrom, start, stop }

  const [variantResult, trvResult, phaseResult] = await Promise.all([
    y1ClickhouseClient.query({
      query: `
        SELECT
          a.position AS position,
          a.reference_end AS reference_end,
          a.source_variant_id AS source_variant_id,
          a.alt_index AS alt_index,
          a.ref_allele AS ref,
          a.alt AS alt,
          browser_variant_id,
          if(length(a.rsids) > 0, a.rsids[1], '') AS rsid,
          a.af AS info_AF,
          a.ac AS info_AC,
          a.an AS info_AN,
          a.allele_type,
          a.allele_length,
          f.info_AF_afr,
          f.info_AF_amr,
          f.info_AF_eas,
          f.info_AF_nfe,
          f.info_AF_sas,
          a.cadd_phred,
          a.phylop,
          [] AS sv_consequences,
          if(length(a.rsids) > 0, a.rsids[1], NULL) AS dbsnp_id,
          NULL AS tr_id,
          NULL AS tr_motifs,
          NULL AS tr_struc,
          NULL AS allele_methylation,
          [] AS motif_counts,
          NULL AS allele_purity,
          a.short_read_match_id,
          a.major_consequence,
          groupUniqArray(tuple(c.sample_id, toUInt16(c.genotype_position + 1))) AS carriers
        FROM (
          SELECT *, concat(source_variant_id, '~', toString(alt_index)) AS browser_variant_id
          FROM lr_y1_alleles
          WHERE run_id = {runId:String}
            AND release = 'y1' AND cohort = 'hgsvc_hprc' AND reference_genome = 'GRCh38'
            AND chrom = {chrom:String}
            AND position BETWEEN {start:UInt32} AND {stop:UInt32}
        ) AS a
        INNER JOIN lr_y1_carriers AS c
          ON a.run_id = c.run_id
          AND a.chrom = c.chrom
          AND a.position = c.position
          AND a.source_variant_id = c.source_variant_id
          AND a.alt_index = c.alt_index
        LEFT JOIN (
          SELECT source_variant_id, alt_index,
            anyIf(toNullable(af), division = 'afr' AND values_available = 1) AS info_AF_afr,
            anyIf(toNullable(af), division = 'amr' AND values_available = 1) AS info_AF_amr,
            anyIf(toNullable(af), division = 'eas' AND values_available = 1) AS info_AF_eas,
            anyIf(toNullable(af), division = 'nfe' AND values_available = 1) AS info_AF_nfe,
            anyIf(toNullable(af), division = 'sas' AND values_available = 1) AS info_AF_sas
          FROM lr_y1_frequencies
          WHERE run_id = {runId:String}
            AND release = 'y1' AND cohort = 'hgsvc_hprc' AND reference_genome = 'GRCh38'
            AND chrom = {chrom:String}
            AND position BETWEEN {start:UInt32} AND {stop:UInt32}
          GROUP BY source_variant_id, alt_index
        ) AS f
          ON a.source_variant_id = f.source_variant_id AND a.alt_index = f.alt_index
        WHERE c.run_id = {runId:String}
          AND c.release = 'y1' AND c.cohort = 'hgsvc_hprc' AND c.reference_genome = 'GRCh38'
          AND c.chrom = {chrom:String}
          AND c.position BETWEEN {start:UInt32} AND {stop:UInt32}
          AND (${deterministicCarrier})
        GROUP BY a.position, a.reference_end, a.source_variant_id, a.alt_index,
          a.ref_allele, a.alt, browser_variant_id, a.rsids,
          a.af, a.ac, a.an, a.allele_type, a.allele_length,
          f.info_AF_afr, f.info_AF_amr, f.info_AF_eas, f.info_AF_nfe, f.info_AF_sas,
          a.cadd_phred, a.phylop, a.short_read_match_id, a.major_consequence
        ORDER BY a.position, browser_variant_id
      `,
      query_params: queryParams,
      format: 'JSONEachRow',
    }),
    y1ClickhouseClient.query({
      query: `
        SELECT c.position AS position, a.ref_allele AS ref, c.alt AS alt,
          c.sample_id,
          toUInt16(c.genotype_position + 1) AS strand
        FROM lr_y1_carriers AS c
        INNER JOIN lr_y1_alleles AS a
          ON c.run_id = a.run_id
          AND c.chrom = a.chrom
          AND c.position = a.position
          AND c.source_variant_id = a.source_variant_id
          AND c.alt_index = a.alt_index
        WHERE c.run_id = {runId:String}
          AND c.release = 'y1' AND c.cohort = 'hgsvc_hprc' AND c.reference_genome = 'GRCh38'
          AND c.chrom = {chrom:String}
          AND c.position BETWEEN {start:UInt32} AND {stop:UInt32}
          AND a.allele_type = 'trv'
          AND (${deterministicCarrier})
      `,
      query_params: queryParams,
      format: 'JSONEachRow',
    }),
    y1ClickhouseClient.query({
      query: `
        SELECT
          count() AS total_carrier_rows,
          countIf(gt_phased = 1) AS phased_rows,
          countIf(length(gt_alleles) = 1) AS haploid_rows,
          countIf(
            gt_phased = 0 AND length(gt_alleles) > 1
            AND arrayAll(allele -> ifNull(allele = alt_index, false), gt_alleles)
          ) AS unphased_homozygous_alt_rows,
          countIf(NOT (${deterministicCarrier})) AS ambiguous_unphased_rows
        FROM lr_y1_carriers AS c
        WHERE run_id = {runId:String}
          AND release = 'y1' AND cohort = 'hgsvc_hprc' AND reference_genome = 'GRCh38'
          AND chrom = {chrom:String}
          AND position BETWEEN {start:UInt32} AND {stop:UInt32}
      `,
      query_params: queryParams,
      format: 'JSONEachRow',
    }),
  ])

  const variants = (await variantResult.json()) as any[]
  const trvCarriers = (await trvResult.json()) as any[]
  const phaseRows = (await phaseResult.json()) as any[]
  const raw = phaseRows[0] || {}
  const phaseSummary: Y1PhaseSummary = {
    total_carrier_rows: Number(raw.total_carrier_rows || 0),
    phased_rows: Number(raw.phased_rows || 0),
    haploid_rows: Number(raw.haploid_rows || 0),
    unphased_homozygous_alt_rows: Number(raw.unphased_homozygous_alt_rows || 0),
    ambiguous_unphased_rows: Number(raw.ambiguous_unphased_rows || 0),
  }

  // Keep identity construction in one place and preserve the exact source
  // record identity alongside its ALT-specific browser identity.
  const normalizedVariants = variants.map((row) => ({
    ...row,
    variant_id: browserVariantId(row.source_variant_id, Number(row.alt_index)),
  }))

  return { variants: normalizedVariants, trvCarriers, phaseSummary }
}
