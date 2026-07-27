import { y1ClickhouseClient } from '../clickhouse'

export type LongReadCohort = 'hgsvc_hprc' | 'aou'

type Region = { start: number; stop: number }

const normalizeChrom = (chrom: string) => (chrom.startsWith('chr') ? chrom : `chr${chrom}`)

const runIdForCohort = (cohort: LongReadCohort) => {
  const variable = cohort === 'aou' ? 'LR_Y1_AOU_RUN_ID' : 'LR_Y1_HGSVC_RUN_ID'
  const runId = process.env[variable]
  if (!runId) {
    throw new Error(`Y1 pilot requires ${variable}`)
  }
  return runId
}

export const browserVariantId = (sourceVariantId: string, altIndex: number) =>
  `${sourceVariantId}~${altIndex}`

export const sourceIdentityFromBrowserId = (variantId: string) => {
  const match = variantId.match(/^(.*)~([1-9][0-9]*)$/)
  if (!match) return { sourceVariantId: variantId, altIndex: 1 }
  return { sourceVariantId: match[1], altIndex: Number(match[2]) }
}

const frequencyKey = (sourceVariantId: string, altIndex: number) =>
  `${sourceVariantId}\u0000${altIndex}`

const mapY1RowToGraphQL = (row: any, cohort: LongReadCohort, populations: any[]) => ({
  // The browser identity is ALT-specific; source_variant_id remains byte-exact.
  variant_id: browserVariantId(row.source_variant_id, Number(row.alt_index)),
  source_variant_id: row.source_variant_id,
  alt_index: Number(row.alt_index),
  lr_cohort: cohort,
  reference_genome: 'GRCh38',
  chrom: row.chrom.replace(/^chr/, ''),
  pos: Number(row.position),
  end: Number(row.reference_end),
  length: Number(row.allele_length),
  ref: row.ref_allele,
  alt: row.alt,
  xpos: Number(row.xpos),
  rsids: [],
  allele_type: row.allele_type || 'unknown',
  sv_consequences: [],
  filters: Array.isArray(row.filters) ? row.filters : [],
  intergenic: null,
  gene_region: null,
  major_consequence: null,
  cadd_phred: null,
  phylop: null,
  short_read_match_id: null,
  short_read_match_type: null,
  short_read_match_source: null,
  enveloping_tr_id: null,
  enveloped_ids: [],
  motifs: [],
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
})

const fetchPopulationFrequencies = async (
  runId: string,
  chrom: string,
  rangeConditions: string,
  rangeParams: Record<string, string | number>
) => {
  const resultSet = await y1ClickhouseClient.query({
    query: `
      SELECT source_variant_id, alt_index, division AS id, ac, an, af
      FROM lr_y1_frequencies
      WHERE run_id = {runId:String}
        AND chrom = {chrom:String}
        AND (${rangeConditions})
        AND division != 'all'
        AND values_available = 1
    `,
    query_params: { runId, chrom, ...rangeParams },
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
  cohort: LongReadCohort
) => {
  if (regions.length === 0) return []
  const chrom = normalizeChrom(chromValue)
  const runId = runIdForCohort(cohort)
  const rangeConditions = regions
    .map((region, index) => `(position BETWEEN {start${index}:UInt32} AND {stop${index}:UInt32})`)
    .join(' OR ')
  const queryParams: Record<string, string | number> = { runId, chrom }
  regions.forEach((region, index) => {
    queryParams[`start${index}`] = region.start
    queryParams[`stop${index}`] = region.stop
  })

  const [alleleResult, populationFrequencies] = await Promise.all([
    y1ClickhouseClient.query({
      query: `
        SELECT chrom, position, reference_end, xpos, source_variant_id, alt_index,
          ref_allele, alt, allele_type, filters, ac, an, af, allele_length
        FROM lr_y1_alleles
        WHERE run_id = {runId:String}
          AND chrom = {chrom:String}
          AND (${rangeConditions})
        ORDER BY position, source_variant_id, alt_index
      `,
      query_params: queryParams,
      format: 'JSONEachRow',
    }),
    fetchPopulationFrequencies(runId, chrom, rangeConditions, queryParams),
  ])

  const rows = (await alleleResult.json()) as any[]
  return rows.map((row) =>
    mapY1RowToGraphQL(
      row,
      cohort,
      populationFrequencies.get(frequencyKey(row.source_variant_id, Number(row.alt_index))) || []
    )
  )
}

export const fetchY1VariantsByRegion = async (
  region: { chrom: string; start: number; stop: number },
  cohort: LongReadCohort
) => fetchY1VariantsByRegions(region.chrom, [region], cohort)

export const fetchY1VariantById = async (variantId: string, cohort: LongReadCohort) => {
  const runId = runIdForCohort(cohort)
  const { sourceVariantId, altIndex } = sourceIdentityFromBrowserId(variantId)
  const resultSet = await y1ClickhouseClient.query({
    query: `
      SELECT position, reference_end, xpos, source_variant_id, alt_index,
        ref_allele, alt, allele_type, filters, ac, an, af, allele_length, chrom
      FROM lr_y1_alleles
      WHERE run_id = {runId:String}
        AND source_variant_id = {sourceVariantId:String}
        AND alt_index = {altIndex:UInt16}
      LIMIT 1
    `,
    query_params: { runId, sourceVariantId, altIndex },
    format: 'JSONEachRow',
  })
  const rows = (await resultSet.json()) as any[]
  if (!rows.length) return null

  const row = rows[0]
  const frequencies = await fetchPopulationFrequencies(
    runId,
    row.chrom,
    `source_variant_id = {sourceVariantId:String} AND alt_index = {altIndex:UInt16}`,
    { sourceVariantId, altIndex }
  )
  return mapY1RowToGraphQL(
    row,
    cohort,
    frequencies.get(frequencyKey(row.source_variant_id, Number(row.alt_index))) || []
  )
}
