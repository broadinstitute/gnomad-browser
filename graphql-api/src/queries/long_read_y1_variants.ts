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

const CONSEQUENCE_TERMS = [
  'transcript_ablation',
  'splice_acceptor_variant',
  'splice_donor_variant',
  'stop_gained',
  'frameshift_variant',
  'stop_lost',
  'start_lost',
  'initiator_codon_variant',
  'transcript_amplification',
  'inframe_insertion',
  'inframe_deletion',
  'missense_variant',
  'protein_altering_variant',
  'splice_region_variant',
  'incomplete_terminal_codon_variant',
  'start_retained_variant',
  'stop_retained_variant',
  'synonymous_variant',
  'coding_sequence_variant',
  'mature_miRNA_variant',
  '5_prime_UTR_variant',
  '3_prime_UTR_variant',
  'non_coding_transcript_exon_variant',
  'non_coding_exon_variant',
  'intron_variant',
  'NMD_transcript_variant',
  'non_coding_transcript_variant',
  'nc_transcript_variant',
  'upstream_gene_variant',
  'downstream_gene_variant',
  'TFBS_ablation',
  'TFBS_amplification',
  'TF_binding_site_variant',
  'regulatory_region_ablation',
  'regulatory_region_amplification',
  'feature_elongation',
  'regulatory_region_variant',
  'feature_truncation',
  'intergenic_variant',
]
const CONSEQUENCE_RANK = new Map(CONSEQUENCE_TERMS.map((term, index) => [term, index]))

export const selectAltAnnotation = (value: unknown, altIndex: number) => {
  if (typeof value !== 'string' || !value || value === '.') return null
  const values = value.split(',')
  return values.length === 1 ? values[0] : values[altIndex - 1] || null
}

const normalizedVepAllele = (ref: string, alt: string) => {
  if (alt.startsWith('<')) return alt
  let start = 0
  while (start < ref.length && start < alt.length && ref[start] === alt[start]) start += 1
  let refEnd = ref.length
  let altEnd = alt.length
  while (refEnd > start && altEnd > start && ref[refEnd - 1] === alt[altEnd - 1]) {
    refEnd -= 1
    altEnd -= 1
  }
  return alt.slice(start, altEnd) || '-'
}

export const majorConsequenceFromVep = (
  pickedVep: unknown,
  ref: string,
  alt: string,
  altIndex: number
) => {
  if (typeof pickedVep !== 'string' || !pickedVep) return null
  const entries = pickedVep.split(',').map((entry) => entry.split('|'))
  const expectedAlleles = new Set([alt, normalizedVepAllele(ref, alt)])
  const alleleEntries = entries.filter((fields) => expectedAlleles.has(fields[0]))
  const distinctAlleles = [...new Set(entries.map((fields) => fields[0]))]
  const fallbackAllele = distinctAlleles[altIndex - 1]
  const selected = alleleEntries.length
    ? alleleEntries
    : entries.filter((fields) => fields[0] === fallbackAllele)
  const terms = selected.flatMap((fields) => (fields[1] || '').split('&').filter(Boolean))
  if (!terms.length) return null
  return terms.reduce((best, term) =>
    (CONSEQUENCE_RANK.get(term) ?? 999) < (CONSEQUENCE_RANK.get(best) ?? 999) ? term : best
  )
}

const optionalNumber = (value: string | null) => {
  if (value == null) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const mapY1RowToGraphQL = (row: any, cohort: LongReadCohort, populations: any[]) => {
  const altIndex = Number(row.alt_index)
  const dbSnpId = selectAltAnnotation(row.dbsnp_id, altIndex)
  const majorConsequence = majorConsequenceFromVep(
    row.picked_vep,
    row.ref_allele,
    row.alt,
    altIndex
  )
  return {
    // The browser identity is ALT-specific; source_variant_id remains byte-exact.
    variant_id: browserVariantId(row.source_variant_id, Number(row.alt_index)),
    source_variant_id: row.source_variant_id,
    alt_index: altIndex,
    lr_cohort: cohort,
    reference_genome: 'GRCh38',
    chrom: row.chrom.replace(/^chr/, ''),
    pos: Number(row.position),
    end: Number(row.reference_end),
    length: Number(row.allele_length),
    ref: row.ref_allele,
    alt: row.alt,
    xpos: Number(row.xpos),
    rsids: dbSnpId ? [dbSnpId] : [],
    allele_type: row.allele_type || 'unknown',
    sv_consequences: [],
    filters: Array.isArray(row.filters) ? row.filters : [],
    intergenic: null,
    gene_region: null,
    major_consequence: majorConsequence,
    cadd_phred: optionalNumber(selectAltAnnotation(row.cadd_phred, altIndex)),
    phylop: optionalNumber(selectAltAnnotation(row.phylop, altIndex)),
    short_read_match_id: selectAltAnnotation(row.short_read_match_id, altIndex),
    short_read_match_type: selectAltAnnotation(row.short_read_match_type, altIndex),
    short_read_match_source: selectAltAnnotation(row.short_read_match_source, altIndex),
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
  }
}

const annotationSelect = `
  JSONExtractString(source_info_json, 'cadd_phred') AS cadd_phred,
  JSONExtractString(source_info_json, 'phylop') AS phylop,
  JSONExtractString(source_info_json, 'dbSNP_ID') AS dbsnp_id,
  JSONExtractString(source_info_json, 'gnomAD_V4_match_ID') AS short_read_match_id,
  JSONExtractString(source_info_json, 'gnomAD_V4_match_type') AS short_read_match_type,
  JSONExtractString(source_info_json, 'gnomAD_V4_match_source') AS short_read_match_source,
  arrayStringConcat(arrayFilter(
    entry -> length(splitByChar('|', entry)) > 22
      AND arrayElement(splitByChar('|', entry), 23) = '1'
      AND arrayElement(splitByChar('|', entry), 6) = 'Transcript',
    splitByChar(',', JSONExtractString(source_info_json, 'vep'))
  ), ',') AS picked_vep
`

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
  const alleleRangeConditions = rangeConditions.replace(/\bposition\b/g, 'a.position')
  const queryParams: Record<string, string | number> = { runId, chrom }
  regions.forEach((region, index) => {
    queryParams[`start${index}`] = region.start
    queryParams[`stop${index}`] = region.stop
  })

  const [alleleResult, populationFrequencies] = await Promise.all([
    y1ClickhouseClient.query({
      query: `
        SELECT a.chrom, a.position, a.reference_end, a.xpos, a.source_variant_id, a.alt_index,
          a.ref_allele, a.alt, a.allele_type, a.filters, a.ac, a.an, a.af, a.allele_length,
          s.cadd_phred, s.phylop, s.dbsnp_id, s.short_read_match_id,
          s.short_read_match_type, s.short_read_match_source, s.picked_vep
        FROM lr_y1_alleles AS a
        ANY LEFT JOIN (
          SELECT run_id, chrom, position, source_variant_id, ${annotationSelect}
          FROM lr_y1_summaries
          WHERE run_id = {runId:String}
            AND chrom = {chrom:String}
            AND (${rangeConditions})
        ) AS s ON a.run_id = s.run_id
          AND a.chrom = s.chrom
          AND a.position = s.position
          AND a.source_variant_id = s.source_variant_id
        WHERE a.run_id = {runId:String}
          AND a.chrom = {chrom:String}
          AND (${alleleRangeConditions})
        ORDER BY a.position, a.source_variant_id, a.alt_index
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
      SELECT a.position, a.reference_end, a.xpos, a.source_variant_id, a.alt_index,
        a.ref_allele, a.alt, a.allele_type, a.filters, a.ac, a.an, a.af,
        a.allele_length, a.chrom, s.cadd_phred, s.phylop, s.dbsnp_id,
        s.short_read_match_id, s.short_read_match_type, s.short_read_match_source,
        s.picked_vep
      FROM lr_y1_alleles AS a
      ANY LEFT JOIN (
        SELECT run_id, chrom, position, source_variant_id, ${annotationSelect}
        FROM lr_y1_summaries
        WHERE run_id = {runId:String}
          AND source_variant_id = {sourceVariantId:String}
      ) AS s ON a.run_id = s.run_id
        AND a.chrom = s.chrom
        AND a.position = s.position
        AND a.source_variant_id = s.source_variant_id
      WHERE a.run_id = {runId:String}
        AND a.source_variant_id = {sourceVariantId:String}
        AND a.alt_index = {altIndex:UInt16}
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
