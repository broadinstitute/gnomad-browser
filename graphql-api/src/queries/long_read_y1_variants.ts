import { y1ClickhouseClient } from '../clickhouse'
import { resolveY1ReferenceEnd } from './long_read_y1_interval'

export type LongReadCohort = 'hgsvc_hprc' | 'aou'

type Region = { start: number; stop: number }

const normalizeChrom = (chrom: string) => (chrom.startsWith('chr') ? chrom : `chr${chrom}`)

export const browserVariantId = (sourceVariantId: string, altIndex: number) =>
  `${sourceVariantId}~${altIndex}`

export const sourceIdentityFromBrowserId = (variantId: string) => {
  const match = variantId.match(/^(.*)~([1-9][0-9]*)$/)
  if (!match) return { sourceVariantId: variantId, altIndex: 1 }
  return { sourceVariantId: match[1], altIndex: Number(match[2]) }
}

const frequencyKey = (sourceVariantId: string, altIndex: number) =>
  `${sourceVariantId}\u0000${altIndex}`

const optionalNumber = (value: unknown) => {
  if (value == null) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export const mapY1RowToGraphQL = (
  row: any,
  cohort: LongReadCohort,
  populations: any[],
  runId: string
) => {
  const altIndex = Number(row.alt_index)
  return {
    // The browser identity is ALT-specific; source_variant_id remains byte-exact.
    variant_id: browserVariantId(row.source_variant_id, Number(row.alt_index)),
    source_variant_id: row.source_variant_id,
    alt_index: altIndex,
    lr_cohort: cohort,
    data_source: 'Y1_ACCEPTED',
    source_release: 'y1',
    source_run_id: runId,
    reference_genome: 'GRCh38',
    chrom: row.chrom.replace(/^chr/, ''),
    pos: Number(row.position),
    end: resolveY1ReferenceEnd({
      position: row.position,
      referenceEnd: row.reference_end,
      refAllele: row.ref_allele,
      alleleType: row.allele_type,
    }),
    // allele_length is the signed ALT-minus-REF difference in the accepted Y1
    // allele contract. Preserve a genuine zero, but never turn a missing value
    // into the scientifically meaningful zero-length bin.
    length: optionalNumber(row.allele_length),
    ref: row.ref_allele,
    alt: row.alt,
    xpos: Number(row.xpos),
    rsids: Array.isArray(row.rsids) ? row.rsids : [],
    allele_type: row.allele_type || 'unknown',
    sv_consequences: [],
    filters: Array.isArray(row.filters) ? row.filters : [],
    intergenic: null,
    gene_region: null,
    major_consequence: row.major_consequence || null,
    cadd_phred: optionalNumber(row.cadd_phred),
    phylop: optionalNumber(row.phylop),
    short_read_match_id: row.short_read_match_id || null,
    short_read_match_type: row.short_read_match_type || null,
    short_read_match_source: row.short_read_match_source || null,
    enveloping_tr_id: null,
    enveloped_ids: [],
    motifs:
      typeof row.tr_motifs === 'string'
        ? row.tr_motifs
            .split(',')
            .map((motif: string) => motif.trim())
            .filter(Boolean)
        : [],
    is_likely_tr: row.allele_type === 'trv',
    gnomad_str: null,
    freq: {
      all: {
        ac: Number(row.ac),
        an: Number(row.an),
        af: Number(row.af),
      },
      populations,
    },
    transcript_consequences: null,
    genes: null,
    main_reference_region: null,
    allele_size_distribution: null,
    genotype_distribution: null,
    max_repunits: null,
  }
}

const fetchPopulationFrequencies = async (
  runId: string,
  chrom: string,
  rangeConditions: string,
  rangeParams: Record<string, string | number>,
  cohort: LongReadCohort
) => {
  const resultSet = await y1ClickhouseClient.query({
    query: `
      SELECT source_variant_id, alt_index, division AS id, ac, an, af
      FROM lr_y1_frequencies
      WHERE run_id = {runId:String}
        AND release = 'y1' AND cohort = {cohort:String} AND reference_genome = 'GRCh38'
        AND chrom = {chrom:String}
        AND (${rangeConditions})
        AND division != 'all'
        AND values_available = 1
    `,
    query_params: { runId, chrom, cohort, ...rangeParams },
    format: 'JSONEachRow',
  })
  const rows = (await resultSet.json()) as any[]
  const byAllele = new Map<string, any[]>()
  rows.forEach((row) => {
    const key = frequencyKey(row.source_variant_id, Number(row.alt_index))
    const frequencies = byAllele.get(key) || []
    frequencies.push({
      id: row.id,
      ac: Number(row.ac),
      an: Number(row.an),
      af: Number(row.af),
    })
    byAllele.set(key, frequencies)
  })
  return byAllele
}

export const fetchY1VariantsByRegions = async (
  chromValue: string,
  regions: Region[],
  cohort: LongReadCohort,
  runId: string
) => {
  if (regions.length === 0) return []
  const chrom = normalizeChrom(chromValue)
  const rangeConditions = regions
    .map((region, index) => `(position BETWEEN {start${index}:UInt32} AND {stop${index}:UInt32})`)
    .join(' OR ')
  const queryParams: Record<string, string | number> = { runId, chrom, cohort }
  regions.forEach((region, index) => {
    queryParams[`start${index}`] = region.start
    queryParams[`stop${index}`] = region.stop
  })

  const [alleleResult, populationFrequencies] = await Promise.all([
    y1ClickhouseClient.query({
      query: `
        SELECT chrom, position, reference_end, xpos, source_variant_id, alt_index,
          ref_allele, alt, allele_type, filters, ac, an, af, allele_length,
          rsids, cadd_phred, phylop, major_consequence, short_read_match_id,
          short_read_match_type, short_read_match_source
        FROM lr_y1_alleles
        WHERE run_id = {runId:String}
          AND release = 'y1' AND cohort = {cohort:String} AND reference_genome = 'GRCh38'
          AND chrom = {chrom:String}
          AND (${rangeConditions})
        ORDER BY position, source_variant_id, alt_index
      `,
      query_params: queryParams,
      format: 'JSONEachRow',
    }),
    fetchPopulationFrequencies(runId, chrom, rangeConditions, queryParams, cohort),
  ])

  const rows = (await alleleResult.json()) as any[]
  return rows.map((row) =>
    mapY1RowToGraphQL(
      row,
      cohort,
      populationFrequencies.get(frequencyKey(row.source_variant_id, Number(row.alt_index))) || [],
      runId
    )
  )
}

export const fetchY1VariantsByRegion = async (
  region: { chrom: string; start: number; stop: number },
  cohort: LongReadCohort,
  runId: string
) => fetchY1VariantsByRegions(region.chrom, [region], cohort, runId)

export const fetchY1VariantById = async (
  variantId: string,
  cohort: LongReadCohort,
  runId: string,
  chrom: string
) => {
  const { sourceVariantId, altIndex } = sourceIdentityFromBrowserId(variantId)
  const resultSet = await y1ClickhouseClient.query({
    query: `
      SELECT a.position, a.reference_end, a.xpos, a.source_variant_id, a.alt_index,
        a.ref_allele, a.alt, a.allele_type, a.filters, a.ac, a.an, a.af,
        a.allele_length, a.chrom, a.rsids, a.cadd_phred, a.phylop,
        a.major_consequence, a.short_read_match_id, a.short_read_match_type,
        a.short_read_match_source, s.tr_motifs
      FROM lr_y1_alleles AS a
      LEFT JOIN (
        SELECT run_id, release, cohort, reference_genome, chrom, position,
          source_variant_id,
          any(nullIf(JSONExtractString(source_info_json, 'MOTIFS'), '')) AS tr_motifs
        FROM lr_y1_summaries
        WHERE run_id = {runId:String}
          AND release = 'y1' AND cohort = {cohort:String}
          AND reference_genome = 'GRCh38' AND chrom = {chrom:String}
          AND source_variant_id = {sourceVariantId:String}
        GROUP BY run_id, release, cohort, reference_genome, chrom, position,
          source_variant_id
      ) AS s
        ON a.run_id = s.run_id
        AND a.release = s.release
        AND a.cohort = s.cohort
        AND a.reference_genome = s.reference_genome
        AND a.chrom = s.chrom
        AND a.position = s.position
        AND a.source_variant_id = s.source_variant_id
      WHERE a.run_id = {runId:String}
        AND a.release = 'y1' AND a.cohort = {cohort:String}
        AND a.reference_genome = 'GRCh38' AND a.chrom = {chrom:String}
        AND a.source_variant_id = {sourceVariantId:String}
        AND a.alt_index = {altIndex:UInt16}
      LIMIT 1
    `,
    query_params: { runId, cohort, chrom, sourceVariantId, altIndex },
    format: 'JSONEachRow',
  })
  const rows = (await resultSet.json()) as any[]
  if (!rows.length) return null

  const row = rows[0]
  const frequencies = await fetchPopulationFrequencies(
    runId,
    row.chrom,
    `source_variant_id = {sourceVariantId:String} AND alt_index = {altIndex:UInt16}`,
    { sourceVariantId, altIndex },
    cohort
  )
  return mapY1RowToGraphQL(
    row,
    cohort,
    frequencies.get(frequencyKey(row.source_variant_id, Number(row.alt_index))) || [],
    runId
  )
}
