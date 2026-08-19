import { parseTrLocusId, TrLocusId } from '../../../dataset-metadata/longReadTrLocusId'
import { y1ClickhouseClient } from '../clickhouse'
import { withCache } from '../cache'
import type { Y1SourceSnapshot } from './long_read_y1_provenance'
import { browserVariantId, LongReadCohort } from './long_read_y1_variants'

// Bounded above the largest current source record (584 ALTs) so the compact
// locus index fits in one request without permitting an unbounded response.
export const MAX_TR_LOCUS_PAGE_SIZE = 600
export const DEFAULT_TR_LOCUS_PAGE_SIZE = 50

type Cursor = { version: 1; sourceVariantId: string; altIndex: number }

export const encodeTrAlleleCursor = (cursor: Omit<Cursor, 'version'>) =>
  Buffer.from(JSON.stringify({ version: 1, ...cursor }), 'utf8').toString('base64url')

export const decodeTrAlleleCursor = (value?: string | null): Cursor | null => {
  if (!value) return null
  try {
    const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    if (
      decoded.version !== 1 ||
      typeof decoded.sourceVariantId !== 'string' ||
      !Number.isInteger(decoded.altIndex) ||
      decoded.altIndex < 1
    )
      return null
    return decoded
  } catch {
    return null
  }
}

const parseSourceArray = (value: unknown): unknown[] | null => {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed
  } catch {
    return value.split(',').map((item) => item.trim())
  }
  return null
}

const finiteNumber = (value: unknown) => {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const repeatCountSource = (alignedMc: number | null, fallbackCount: number | null) => {
  if (alignedMc != null) return 'source_mc_allele'
  if (fallbackCount != null) return 'exact_sequence'
  return null
}

const exactSequenceRepeatCount = (ref: string, alt: string, locus: TrLocusId) => {
  if (locus.components.length !== 1 || !ref || !alt || ref[0] !== alt[0]) return null
  const motif = locus.components[0].motif
  const repeated = alt.slice(1)
  if (!repeated.length || repeated.length % motif.length !== 0) return null
  const count = repeated.length / motif.length
  return motif.repeat(count) === repeated.toUpperCase() ? count : null
}

const sourceInfo = (row: any) => {
  try {
    return JSON.parse(row.source_info_json || '{}')
  } catch {
    return {}
  }
}

const exactComponentsEqual = (left: TrLocusId, right: TrLocusId) =>
  left.canonicalId === right.canonicalId

const queryRows = async (query: string, query_params: Record<string, unknown>) => {
  const result = await y1ClickhouseClient.query({ query, query_params, format: 'JSONEachRow' })
  return (await result.json()) as any[]
}

const cursorForSelectedAllelePage = (
  selectedAllele: string | null | undefined,
  sourceRecords: { source_variant_id: string; alt_count: number }[],
  first: number
) => {
  if (!selectedAllele) return { cursor: null, valid: false }
  const match = /^(.*)~([1-9][0-9]*)$/.exec(selectedAllele)
  if (!match) return { cursor: null, valid: false }
  const sourceIndex = sourceRecords.findIndex((record) => record.source_variant_id === match[1])
  const altIndex = Number(match[2])
  if (sourceIndex < 0 || altIndex > sourceRecords[sourceIndex].alt_count)
    return { cursor: null, valid: false }

  const absoluteIndex =
    sourceRecords.slice(0, sourceIndex).reduce((sum, record) => sum + record.alt_count, 0) +
    altIndex -
    1
  const pageStart = Math.floor(absoluteIndex / first) * first
  if (pageStart === 0) return { cursor: null, valid: true }

  let preceding = pageStart
  for (const record of sourceRecords) {
    if (preceding <= record.alt_count) {
      return {
        cursor: {
          version: 1 as const,
          sourceVariantId: record.source_variant_id,
          altIndex: preceding,
        },
        valid: true,
      }
    }
    preceding -= record.alt_count
  }
  return { cursor: null, valid: false }
}

const fetchLongReadTrLocusUncached = async ({
  id,
  cohort,
  first = DEFAULT_TR_LOCUS_PAGE_SIZE,
  after,
  selectedAllele,
  source,
}: {
  id: string
  cohort: LongReadCohort
  first?: number
  after?: string | null
  selectedAllele?: string | null
  source: Y1SourceSnapshot
}) => {
  const locus = parseTrLocusId(id)
  if (!locus) throw new Error('INVALID_TR_LOCUS_ID')
  if (!Number.isInteger(first) || first < 1 || first > MAX_TR_LOCUS_PAGE_SIZE)
    throw new Error('INVALID_TR_LOCUS_PAGE_SIZE')
  if (`chr${locus.components[0].chrom}` !== source.chrom) return null

  // TRID is authoritative. Candidate rows are still parsed and compared in
  // application code so a malformed source value can never become identity.
  const summaryRows = await queryRows(
    `
      SELECT task_id, attempt_id, position, source_variant_id, ref_allele, alts, ac, an, af,
        allele_lengths, source_info_json
      FROM lr_y1_summaries
      WHERE run_id = {runId:String} AND release = 'y1'
        AND cohort = {cohort:String} AND reference_genome = 'GRCh38'
        AND chrom = {chrom:String} AND allele_type = 'trv'
        AND JSONExtractString(source_info_json, 'TRID') = {sourceTrid:String}
      ORDER BY position, source_variant_id
    `,
    {
      runId: source.run_id,
      cohort,
      chrom: source.chrom,
      sourceTrid: locus.sourceTrid,
    }
  )
  if (!summaryRows.length) return null

  const summaries = summaryRows.map((row) => {
    const info = sourceInfo(row)
    const parsed = parseTrLocusId(String(info.TRID || ''))
    if (!parsed || !exactComponentsEqual(parsed, locus)) throw new Error('TR_LOCUS_INVARIANT')
    const altCount = Array.isArray(row.alts) ? row.alts.length : 0
    if (!altCount) throw new Error('TR_LOCUS_INVARIANT')
    return { row, info, parsed, alt_count: altCount, source_variant_id: row.source_variant_id }
  })

  const sourceIds = summaries.map((summary) => summary.source_variant_id)
  const sourceOrder = new Map(sourceIds.map((sourceId, index) => [sourceId, index]))
  let cursor = decodeTrAlleleCursor(after)
  if (after && !cursor) throw new Error('INVALID_TR_LOCUS_CURSOR')
  let selectedAlleleValid: boolean | null = null
  if (!after && selectedAllele) {
    const selected = cursorForSelectedAllelePage(selectedAllele, summaries, first)
    cursor = selected.cursor
    selectedAlleleValid = selected.valid
  }
  if (cursor && !sourceOrder.has(cursor.sourceVariantId)) throw new Error('INVALID_TR_LOCUS_CURSOR')

  const cursorSourceOrder = cursor ? sourceOrder.get(cursor.sourceVariantId)! : -1
  const alleleRows = await queryRows(
    `
      SELECT source_variant_id, alt_index, ref_allele, alt, allele_length, ac, an, af
      FROM lr_y1_alleles
      WHERE run_id = {runId:String} AND release = 'y1'
        AND cohort = {cohort:String} AND reference_genome = 'GRCh38'
        AND chrom = {chrom:String} AND source_variant_id IN {sourceIds:Array(String)}
        AND (
          {hasCursor:UInt8} = 0 OR indexOf({sourceIds:Array(String)}, source_variant_id) > {cursorOrder:UInt16}
          OR (source_variant_id = {cursorSourceId:String} AND alt_index > {cursorAltIndex:UInt16})
        )
      ORDER BY indexOf({sourceIds:Array(String)}, source_variant_id), alt_index
      LIMIT {limit:UInt16}
    `,
    {
      runId: source.run_id,
      cohort,
      chrom: source.chrom,
      sourceIds,
      hasCursor: cursor ? 1 : 0,
      cursorOrder: cursorSourceOrder + 1,
      cursorSourceId: cursor?.sourceVariantId || '',
      cursorAltIndex: cursor?.altIndex || 0,
      limit: first + 1,
    }
  )
  const hasNextPage = alleleRows.length > first
  const pageRows = alleleRows.slice(0, first)

  const frequencyParams: Record<string, unknown> = {
    runId: source.run_id,
    cohort,
    chrom: source.chrom,
  }
  const frequencyConditions = pageRows.map((row, index) => {
    frequencyParams[`source${index}`] = row.source_variant_id
    frequencyParams[`alt${index}`] = Number(row.alt_index)
    return `(source_variant_id = {source${index}:String} AND alt_index = {alt${index}:UInt16})`
  })
  const frequencyRows = frequencyConditions.length
    ? await queryRows(
        `
          SELECT source_variant_id, alt_index, division AS id, ac, an, af
          FROM lr_y1_frequencies
          WHERE run_id = {runId:String} AND release = 'y1'
            AND cohort = {cohort:String} AND reference_genome = 'GRCh38'
            AND chrom = {chrom:String} AND division != 'all' AND values_available = 1
            AND position(division, '_') = 0
            AND (${frequencyConditions.join(' OR ')})
          ORDER BY source_variant_id, alt_index, division
        `,
        frequencyParams
      )
    : []
  const frequencies = new Map<string, any[]>()
  for (const row of frequencyRows) {
    const key = `${row.source_variant_id}\u0000${row.alt_index}`
    const values = frequencies.get(key) || []
    values.push({ id: row.id, ac: Number(row.ac), an: Number(row.an), af: Number(row.af) })
    frequencies.set(key, values)
  }

  const carrierRows = source.carriers_available
    ? await queryRows(
        `
          SELECT uniqExact(sample_id) AS unique_carrier_count
          FROM lr_y1_carriers
          WHERE run_id = {runId:String} AND release = 'y1'
            AND cohort = {cohort:String} AND reference_genome = 'GRCh38'
            AND chrom = {chrom:String} AND source_variant_id IN {sourceIds:Array(String)}
        `,
        { runId: source.run_id, cohort, chrom: source.chrom, sourceIds }
      )
    : []

  const sourceRecords = summaries.map(({ row, info, alt_count: altCount }, recordIndex) => {
    const ac = Array.isArray(row.ac) ? row.ac.map(Number) : []
    const af = Array.isArray(row.af) ? row.af.map(Number) : []
    return {
      record_index: recordIndex + 1,
      source_variant_id: row.source_variant_id,
      // Internal immutable identity used by the locus-scoped ancillary join.
      // These remain absent from the legacy public source-record shape.
      task_id: row.task_id,
      attempt_id: row.attempt_id,
      position: Number(row.position),
      alt_count: altCount,
      ref: row.ref_allele,
      non_reference_ac: ac.reduce((sum: number, value: number) => sum + value, 0),
      an: Number(row.an),
      non_reference_af: af.reduce((sum: number, value: number) => sum + value, 0),
      source: info.SOURCE || null,
      region: info.REGION || null,
    }
  })

  const alleles = pageRows.map((row) => {
    const summary = summaries[sourceOrder.get(row.source_variant_id)!]
    const mc = parseSourceArray(summary.info.MC_allele)
    const ap = parseSourceArray(summary.info.AP_allele)
    const altIndex = Number(row.alt_index)
    const alignedMc = mc && mc.length === summary.alt_count + 1 ? finiteNumber(mc[altIndex]) : null
    const fallbackCount =
      alignedMc == null ? exactSequenceRepeatCount(row.ref_allele, row.alt, locus) : null
    return {
      variant_id: browserVariantId(row.source_variant_id, altIndex),
      source_variant_id: row.source_variant_id,
      alt_index: altIndex,
      alt_count: summary.alt_count,
      ref: row.ref_allele,
      alt: row.alt,
      length: finiteNumber(row.allele_length),
      repeat_count: alignedMc ?? fallbackCount,
      repeat_count_source: repeatCountSource(alignedMc, fallbackCount),
      motif_purity: ap && ap.length === summary.alt_count + 1 ? finiteNumber(ap[altIndex]) : null,
      freq: {
        all: { ac: Number(row.ac), an: Number(row.an), af: Number(row.af) },
        populations: frequencies.get(`${row.source_variant_id}\u0000${row.alt_index}`) || [],
      },
    }
  })
  const finalAllele = alleles[alleles.length - 1]
  const motifs = Array.from(
    new Set(
      summaries.flatMap(({ info }) =>
        String(info.MOTIFS || '')
          .split(',')
          .map((motif) => motif.trim())
          .filter(Boolean)
      )
    )
  )

  return {
    id: locus.canonicalId,
    source_trid: locus.sourceTrid,
    reference_genome: 'GRCh38',
    chrom: locus.components[0].chrom,
    components: locus.components,
    motifs,
    structure: summaries.length === 1 ? summaries[0].info.STRUC || null : null,
    lr_cohort: cohort,
    source_release: source.release,
    source_run_id: source.run_id,
    // Kept internal for exact ancillary cache/query identity.
    primary_database: source.database,
    source_records: sourceRecords,
    total_alleles: summaries.reduce((sum, summary) => sum + summary.alt_count, 0),
    unique_carrier_count: source.carriers_available
      ? Number(carrierRows[0]?.unique_carrier_count || 0)
      : null,
    selected_allele_valid: selectedAllele ? Boolean(selectedAlleleValid) : null,
    short_read_matches: [],
    alleles: {
      nodes: alleles,
      page_info: {
        has_next_page: hasNextPage,
        end_cursor:
          hasNextPage && finalAllele
            ? encodeTrAlleleCursor({
                sourceVariantId: finalAllele.source_variant_id,
                altIndex: finalAllele.alt_index,
              })
            : null,
      },
    },
  }
}

export const fetchLongReadTrLocus = withCache(
  fetchLongReadTrLocusUncached,
  ({ id, cohort, first = DEFAULT_TR_LOCUS_PAGE_SIZE, after, selectedAllele, source }) =>
    `lr_tr_locus:v1:${cohort}:${source.run_id}:${source.chrom}:${id}:${first}:${after || 'first'}:${
      selectedAllele || 'none'
    }`,
  { expiration: 300 }
)
