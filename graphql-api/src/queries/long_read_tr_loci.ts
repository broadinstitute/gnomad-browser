import { parseTrLocusId, TrLocusId } from '../../../dataset-metadata/longReadTrLocusId'
import { y1ClickhouseClient } from '../clickhouse'
import { withCache } from '../cache'
import type { Y1SourceSnapshot } from './long_read_y1_provenance'
import { browserVariantId, LongReadCohort } from './long_read_y1_variants'

// The exact-ALT index is intentionally bounded. Scientific aggregates fail closed
// rather than silently truncating a locus that exceeds this contract.
export const MAX_TR_LOCUS_PAGE_SIZE = 600
export const DEFAULT_TR_LOCUS_PAGE_SIZE = 50
export const MAX_TR_LOCUS_FREQUENCY_ROWS = 20_000
export const MAX_TR_LOCUS_GENOTYPE_GROUPS = 5_000
export const MAX_TR_LOCUS_AGGREGATE_BYTES = 1024 * 1024
// Selected REF/ALT detail has an independent response bound. Sequence is all-or-nothing:
// an over-bound allele keeps its validated compact index node but never returns a prefix.
export const MAX_TR_SELECTED_ALLELE_DETAIL_BYTES = 1024 * 1024

const REFERENCE_ALLELE_ID = 'REFERENCE'
const WHOLE_RECORD_UNIT = 'WHOLE_RECORD_DELTA_BP'

type Cursor = { version: 1; sourceVariantId: string; altIndex: number }
type CompactAllele = {
  source_variant_id: string
  alt_index: number
  ref_allele?: string | null
  alt?: string | null
  allele_length: number | null
  ac: number
  an: number
  af: number
}

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

const integer = (value: unknown) => {
  const number = Number(value)
  return Number.isInteger(number) ? number : null
}

const repeatCountSource = (alignedMc: number | null) =>
  alignedMc == null ? null : 'source_mc_allele'

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
  const result = await y1ClickhouseClient.query({
    query,
    query_params,
    format: 'JSONEachRow',
    clickhouse_settings: { max_execution_time: 5 },
  })
  return (await result.json()) as any[]
}

const unavailable = (reason_code: string) => ({
  status: 'UNAVAILABLE',
  reason_code,
  unit: WHOLE_RECORD_UNIT,
})

const responseWithinBound = (value: unknown) =>
  Buffer.byteLength(JSON.stringify(value), 'utf8') <= MAX_TR_LOCUS_AGGREGATE_BYTES

const selectedDetailWithinBound = (value: unknown) =>
  Buffer.byteLength(JSON.stringify(value), 'utf8') <= MAX_TR_SELECTED_ALLELE_DETAIL_BYTES

const compactAlleleKey = (sourceVariantId: string, altIndex: number) =>
  `${sourceVariantId}\u0000${altIndex}`

const parseCompactAllele = (row: any): CompactAllele | null => {
  const altIndex = integer(row.alt_index)
  if (
    typeof row.source_variant_id !== 'string' ||
    !row.source_variant_id ||
    !altIndex ||
    altIndex < 1
  )
    return null
  return {
    source_variant_id: row.source_variant_id,
    alt_index: altIndex,
    ref_allele: typeof row.ref_allele === 'string' ? row.ref_allele : null,
    alt: typeof row.alt === 'string' ? row.alt : null,
    allele_length: finiteNumber(row.allele_length),
    ac: Number(row.ac),
    an: Number(row.an),
    af: Number(row.af),
  }
}

const validateCompleteAlleles = (
  rows: CompactAllele[],
  sourceRecords: { source_variant_id: string; alt_count: number }[]
) => {
  const expectedTotal = sourceRecords.reduce((sum, record) => sum + record.alt_count, 0)
  if (expectedTotal > MAX_TR_LOCUS_PAGE_SIZE) return 'ALT_COUNT_EXCEEDS_600'
  if (rows.length !== expectedTotal) return 'MISSING_OR_DUPLICATE_ALT_INDEX'
  const seen = new Set<string>()
  for (const record of sourceRecords) {
    for (let altIndex = 1; altIndex <= record.alt_count; altIndex += 1) {
      seen.add(compactAlleleKey(record.source_variant_id, altIndex))
    }
  }
  for (const row of rows) {
    const key = compactAlleleKey(row.source_variant_id, row.alt_index)
    if (!seen.delete(key)) return 'MISSING_OR_DUPLICATE_ALT_INDEX'
    if (row.allele_length == null) return 'NONFINITE_WHOLE_RECORD_DELTA'
    if (!Number.isInteger(row.ac) || row.ac < 0 || !Number.isInteger(row.an) || row.an < 0)
      return 'MALFORMED_ALLELE_COUNTS'
    if (!Number.isFinite(row.af) || row.af < 0 || row.af > 1 || row.ac > row.an)
      return 'MALFORMED_ALLELE_COUNTS'
  }
  return seen.size ? 'MISSING_OR_DUPLICATE_ALT_INDEX' : null
}

const parseDivision = (division: unknown) => {
  if (division === 'all') return { ancestry_group: null, sex: null }
  if (division === 'XX' || division === 'XY') return { ancestry_group: null, sex: division }
  if (typeof division !== 'string' || !division) return null
  const joint = /^(.+)_(XX|XY)$/.exec(division)
  if (joint) return { ancestry_group: joint[1], sex: joint[2] }
  return { ancestry_group: division, sex: null }
}

export const buildWholeRecordAlleleLandscape = ({
  alleles,
  frequencyRows,
  sourceRecordCount,
  frequencyRowsTruncated = false,
  purityByAllele,
}: {
  alleles: CompactAllele[]
  frequencyRows: any[]
  sourceRecordCount: number
  frequencyRowsTruncated?: boolean
  purityByAllele: Map<string, number | null>
}) => {
  if (sourceRecordCount !== 1) return unavailable('MULTIPLE_SOURCE_RECORDS_NOT_RECONCILABLE')
  if (!alleles.length) return unavailable('NO_COMPLETE_EXACT_ALLELES')
  const calledAlleles = alleles[0].an
  if (alleles.some((allele) => allele.an !== calledAlleles)) {
    return unavailable('INCONSISTENT_CALLED_ALLELE_COUNTS')
  }
  const nonReferenceCalledAlleles = alleles.reduce((sum, allele) => sum + allele.ac, 0)
  if (nonReferenceCalledAlleles > calledAlleles)
    return unavailable('ALLELE_COUNTS_DO_NOT_RECONCILE')

  const byDelta = new Map<number, CompactAllele[]>()
  for (const allele of alleles) {
    const rows = byDelta.get(allele.allele_length!) || []
    rows.push(allele)
    byDelta.set(allele.allele_length!, rows)
  }

  const stackCounts = new Map<string, number>()
  const ancestryGroups = new Set<string>()
  const sexes = new Set<string>()
  const alleleByKey = new Map(
    alleles.map((allele) => [compactAlleleKey(allele.source_variant_id, allele.alt_index), allele])
  )
  const seenFrequencyRows = new Set<string>()
  const stratumAn = new Map<string, number>()
  const stratumAc = new Map<string, number>()
  let malformedStratifiedFrequencies = false
  if (!frequencyRowsTruncated) {
    for (const row of frequencyRows) {
      const parsedDivision = parseDivision(row.division)
      const altIndex = integer(row.alt_index)
      const ac = integer(row.ac)
      const an = integer(row.an)
      const af = finiteNumber(row.af)
      const alleleKey = compactAlleleKey(String(row.source_variant_id || ''), altIndex || 0)
      const allele = alleleByKey.get(alleleKey)
      const division = String(row.division || '')
      const frequencyKey = `${alleleKey}\u0000${division}`
      if (
        !parsedDivision ||
        !allele ||
        ac == null ||
        ac < 0 ||
        an == null ||
        an < 0 ||
        ac > an ||
        af == null ||
        af < 0 ||
        af > 1 ||
        seenFrequencyRows.has(frequencyKey) ||
        (stratumAn.has(division) && stratumAn.get(division) !== an)
      ) {
        malformedStratifiedFrequencies = true
        break
      }
      seenFrequencyRows.add(frequencyKey)
      stratumAn.set(division, an)
      stratumAc.set(division, (stratumAc.get(division) || 0) + ac)
      if (parsedDivision.ancestry_group) ancestryGroups.add(parsedDivision.ancestry_group)
      if (parsedDivision.sex) sexes.add(parsedDivision.sex)
      const stackKey = [
        allele.allele_length,
        parsedDivision.ancestry_group || '',
        parsedDivision.sex || '',
      ].join('\u0000')
      stackCounts.set(stackKey, (stackCounts.get(stackKey) || 0) + ac)
    }
    if ([...stratumAc].some(([division, ac]) => ac > (stratumAn.get(division) ?? -1))) {
      malformedStratifiedFrequencies = true
    }
    if (malformedStratifiedFrequencies) {
      stackCounts.clear()
      ancestryGroups.clear()
      sexes.clear()
    }
  }

  const bins = [...byDelta]
    .sort(([left], [right]) => left - right)
    .map(([delta, members]) => ({
      delta,
      called_alleles: members.reduce((sum, allele) => sum + allele.ac, 0),
      exact_alt_count: members.length,
      allele_ids: members
        .map((allele) => browserVariantId(allele.source_variant_id, allele.alt_index))
        .sort(),
      stacks: [...stackCounts]
        .filter(([key]) => Number(key.split('\u0000')[0]) === delta)
        .map(([key, count]) => {
          const [, ancestryGroup, sex] = key.split('\u0000')
          return {
            ancestry_group: ancestryGroup || null,
            sex: sex || null,
            called_alleles: count,
          }
        })
        .sort((left, right) =>
          `${left.ancestry_group || ''}:${left.sex || ''}`.localeCompare(
            `${right.ancestry_group || ''}:${right.sex || ''}`
          )
        ),
    }))
  if (bins.reduce((sum, bin) => sum + bin.called_alleles, 0) !== nonReferenceCalledAlleles) {
    return unavailable('ALLELE_BINS_DO_NOT_RECONCILE')
  }

  const purityPoints = alleles.flatMap((allele) => {
    const purity = purityByAllele.get(compactAlleleKey(allele.source_variant_id, allele.alt_index))
    return purity == null
      ? []
      : [
          {
            allele_id: browserVariantId(allele.source_variant_id, allele.alt_index),
            delta: allele.allele_length,
            motif_purity: purity,
            called_alleles: allele.ac,
          },
        ]
  })

  const stratifiedAvailable =
    !frequencyRowsTruncated && !malformedStratifiedFrequencies && frequencyRows.length > 0
  let stratifiedUnavailableReason = null
  if (frequencyRowsTruncated) stratifiedUnavailableReason = 'FREQUENCY_ROW_BOUND_EXCEEDED'
  else if (malformedStratifiedFrequencies)
    stratifiedUnavailableReason = 'MALFORMED_STRATIFIED_FREQUENCIES'
  else if (!stratifiedAvailable) stratifiedUnavailableReason = 'NO_STRATIFIED_FREQUENCIES'
  const response = {
    status: 'AVAILABLE',
    reason_code: null,
    unit: WHOLE_RECORD_UNIT,
    called_alleles: calledAlleles,
    non_reference_called_alleles: nonReferenceCalledAlleles,
    reference_called_alleles: calledAlleles - nonReferenceCalledAlleles,
    exact_alt_count: alleles.length,
    stratified_available: stratifiedAvailable,
    stratified_unavailable_reason: stratifiedUnavailableReason,
    ancestry_groups: [...ancestryGroups].sort(),
    sexes: [...sexes].sort(),
    bins,
    purity_points: purityPoints,
    purity_available: purityPoints.length > 0,
    purity_unavailable_reason: purityPoints.length ? null : 'NO_ALIGNED_SOURCE_AP_ALLELE',
  }
  return responseWithinBound(response)
    ? response
    : unavailable('AGGREGATE_RESPONSE_BYTE_BOUND_EXCEEDED')
}

const normalizedSex = (value: unknown) => {
  if (value === 'female' || value === 'XX') return 'XX'
  if (value === 'male' || value === 'XY') return 'XY'
  return 'unknown'
}

export const buildWholeRecordGenotypeLandscape = ({
  rows,
  alleles,
  expectedCalledAlleles,
}: {
  rows: any[]
  alleles: CompactAllele[]
  expectedCalledAlleles: number
}) => {
  if (rows.length > MAX_TR_LOCUS_GENOTYPE_GROUPS)
    return unavailable('GENOTYPE_GROUP_BOUND_EXCEEDED')
  if (expectedCalledAlleles % 2 !== 0) return unavailable('NON_DIPLOID_CALLED_ALLELE_TOTAL')
  const alleleByIndex = new Map(alleles.map((allele) => [allele.alt_index, allele]))
  const cells = new Map<string, any>()
  const observedAlleleCopies = new Map<number, number>()
  const ancestryGroups = new Set<string>()
  const sexes = new Set<string>()
  let calledSamples = 0

  for (const row of rows) {
    const people = integer(row.people)
    const phasedPeople = integer(row.phased_people)
    const invalidPeople = integer(row.invalid_people)
    const pair: (number | null)[] = Array.isArray(row.allele_pair)
      ? row.allele_pair.map(integer)
      : []
    if (
      people == null ||
      people < 0 ||
      phasedPeople == null ||
      phasedPeople < 0 ||
      phasedPeople > people ||
      invalidPeople !== 0 ||
      pair.length !== 2 ||
      pair.some(
        (index: number | null) =>
          index == null || index < 0 || (index > 0 && !alleleByIndex.has(index))
      )
    ) {
      return unavailable('MALFORMED_OR_CONTRADICTORY_GENOTYPE_CALLS')
    }
    calledSamples += people
    for (const alleleIndex of pair as number[]) {
      observedAlleleCopies.set(alleleIndex, (observedAlleleCopies.get(alleleIndex) || 0) + people)
    }
    const ancestryGroup = String(row.ancestry_group || 'unknown')
    const sex = normalizedSex(row.sex)
    ancestryGroups.add(ancestryGroup)
    sexes.add(sex)
    const exactPair: { id: string; delta: number }[] = pair.map((index: number | null) =>
      index === 0
        ? { id: REFERENCE_ALLELE_ID, delta: 0 }
        : {
            id: browserVariantId(alleles[0].source_variant_id, index!),
            delta: alleleByIndex.get(index!)!.allele_length!,
          }
    )
    exactPair.sort((left, right) => left.delta - right.delta || left.id.localeCompare(right.id))
    const cellKey = `${exactPair[0].delta}\u0000${exactPair[1].delta}`
    const cell = cells.get(cellKey) || {
      shorter_delta: exactPair[0].delta,
      longer_delta: exactPair[1].delta,
      people: 0,
      pairs: [],
    }
    cell.people += people
    cell.pairs.push({
      shorter_allele_id: exactPair[0].id,
      longer_allele_id: exactPair[1].id,
      ancestry_group: ancestryGroup,
      sex,
      people,
      phased_people: phasedPeople,
      unphased_people: people - phasedPeople,
    })
    cells.set(cellKey, cell)
  }
  const expectedReferenceCopies =
    expectedCalledAlleles - alleles.reduce((sum, allele) => sum + allele.ac, 0)
  if (
    calledSamples * 2 !== expectedCalledAlleles ||
    expectedReferenceCopies < 0 ||
    (observedAlleleCopies.get(0) || 0) !== expectedReferenceCopies ||
    alleles.some((allele) => (observedAlleleCopies.get(allele.alt_index) || 0) !== allele.ac)
  ) {
    return unavailable('GENOTYPE_TOTAL_DOES_NOT_RECONCILE')
  }
  const response = {
    status: 'AVAILABLE',
    reason_code: null,
    unit: WHOLE_RECORD_UNIT,
    reference_allele_id: REFERENCE_ALLELE_ID,
    called_samples: calledSamples,
    called_alleles: expectedCalledAlleles,
    ancestry_groups: [...ancestryGroups].sort(),
    sexes: [...sexes].sort(),
    cells: [...cells.values()].sort(
      (left, right) =>
        left.shorter_delta - right.shorter_delta || left.longer_delta - right.longer_delta
    ),
  }
  return responseWithinBound(response)
    ? response
    : unavailable('AGGREGATE_RESPONSE_BYTE_BOUND_EXCEEDED')
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
  const preceding = sourceRecords.flatMap((record) =>
    Array.from({ length: record.alt_count }, (_, offset) => ({
      version: 1 as const,
      sourceVariantId: record.source_variant_id,
      altIndex: offset + 1,
    }))
  )[pageStart - 1]
  return { cursor: preceding || null, valid: Boolean(preceding) }
}

const pageStartForCursor = (cursor: Cursor | null, alleles: CompactAllele[]) => {
  if (!cursor) return 0
  const index = alleles.findIndex(
    (allele) =>
      allele.source_variant_id === cursor!.sourceVariantId && allele.alt_index === cursor!.altIndex
  )
  if (index < 0) throw new Error('INVALID_TR_LOCUS_CURSOR')
  return index + 1
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

  const summaryRows = await queryRows(
    `
      SELECT task_id, attempt_id, position, source_variant_id, length(alts) AS alt_count,
        ac, an, af, source_info_json
      FROM lr_y1_summaries
      WHERE run_id = {runId:String} AND release = 'y1'
        AND cohort = {cohort:String} AND reference_genome = 'GRCh38'
        AND chrom = {chrom:String} AND allele_type = 'trv'
        AND JSONExtractString(source_info_json, 'TRID') = {sourceTrid:String}
      ORDER BY position, source_variant_id
      LIMIT {limit:UInt16}
    `,
    {
      runId: source.run_id,
      cohort,
      chrom: source.chrom,
      sourceTrid: locus.sourceTrid,
      limit: MAX_TR_LOCUS_PAGE_SIZE + 1,
    }
  )
  if (!summaryRows.length) return null
  if (summaryRows.length > MAX_TR_LOCUS_PAGE_SIZE) throw new Error('TR_LOCUS_INVARIANT')

  const summaries = summaryRows.map((row) => {
    const info = sourceInfo(row)
    const parsed = parseTrLocusId(String(info.TRID || ''))
    if (!parsed || !exactComponentsEqual(parsed, locus)) throw new Error('TR_LOCUS_INVARIANT')
    const altCount = integer(row.alt_count) || 0
    if (!altCount) throw new Error('TR_LOCUS_INVARIANT')
    return { row, info, parsed, alt_count: altCount, source_variant_id: row.source_variant_id }
  })
  const sourceIds = summaries.map((summary) => summary.source_variant_id)
  const sourceOrder = new Map(sourceIds.map((sourceId, index) => [sourceId, index]))

  const rawAlleleRows = await queryRows(
    `
      SELECT source_variant_id, alt_index, ref_allele, alt, allele_length, ac, an, af
      FROM lr_y1_alleles
      WHERE run_id = {runId:String} AND release = 'y1'
        AND cohort = {cohort:String} AND reference_genome = 'GRCh38'
        AND chrom = {chrom:String} AND source_variant_id IN {sourceIds:Array(String)}
      ORDER BY indexOf({sourceIds:Array(String)}, source_variant_id), alt_index
      LIMIT {limit:UInt16}
    `,
    {
      runId: source.run_id,
      cohort,
      chrom: source.chrom,
      sourceIds,
      limit: MAX_TR_LOCUS_PAGE_SIZE + 1,
    }
  )
  const compactAlleles = rawAlleleRows.map(parseCompactAllele).filter(Boolean) as CompactAllele[]
  const sourceRecords = summaries.map(({ row, info, alt_count: altCount }, recordIndex) => {
    const ac = Array.isArray(row.ac) ? row.ac.map(Number) : []
    const af = Array.isArray(row.af) ? row.af.map(Number) : []
    return {
      record_index: recordIndex + 1,
      source_variant_id: row.source_variant_id,
      task_id: row.task_id,
      attempt_id: row.attempt_id,
      position: Number(row.position),
      alt_count: altCount,
      non_reference_ac: ac.reduce((sum: number, value: number) => sum + value, 0),
      an: Number(row.an),
      non_reference_af: af.reduce((sum: number, value: number) => sum + value, 0),
      source: info.SOURCE || null,
      region: info.REGION || null,
    }
  })
  const completenessReason = validateCompleteAlleles(compactAlleles, sourceRecords)
  const completeAlleles = completenessReason ? [] : compactAlleles
  const exactSequenceIndexWithinBound = responseWithinBound(
    completeAlleles.map(({ source_variant_id, alt_index, ref_allele, alt }) => ({
      source_variant_id,
      alt_index,
      ref_allele,
      alt,
    }))
  )

  const rawFrequencyRows = completeAlleles.length
    ? await queryRows(
        `
          SELECT source_variant_id, alt_index, division, ac, an, af
          FROM lr_y1_frequencies
          WHERE run_id = {runId:String} AND release = 'y1'
            AND cohort = {cohort:String} AND reference_genome = 'GRCh38'
            AND chrom = {chrom:String} AND source_variant_id IN {sourceIds:Array(String)}
            AND values_available = 1
          ORDER BY source_variant_id, alt_index, division
          LIMIT {limit:UInt32}
        `,
        {
          runId: source.run_id,
          cohort,
          chrom: source.chrom,
          sourceIds,
          limit: MAX_TR_LOCUS_FREQUENCY_ROWS + 1,
        }
      )
    : []
  const frequencyRowsTruncated = rawFrequencyRows.length > MAX_TR_LOCUS_FREQUENCY_ROWS
  const frequencyRows = frequencyRowsTruncated
    ? []
    : rawFrequencyRows.filter((row) => row.division !== 'all')
  const frequencies = new Map<string, any[]>()
  for (const row of frequencyRows) {
    const key = compactAlleleKey(row.source_variant_id, Number(row.alt_index))
    const values = frequencies.get(key) || []
    values.push({ id: row.division, ac: Number(row.ac), an: Number(row.an), af: Number(row.af) })
    frequencies.set(key, values)
  }

  const purityByAllele = new Map<string, number | null>()
  for (const summary of summaries) {
    const ap = parseSourceArray(summary.info.AP_allele)
    for (let altIndex = 1; altIndex <= summary.alt_count; altIndex += 1) {
      purityByAllele.set(
        compactAlleleKey(summary.source_variant_id, altIndex),
        ap && ap.length === summary.alt_count + 1 ? finiteNumber(ap[altIndex]) : null
      )
    }
  }

  const wholeRecordAlleleLandscape = completenessReason
    ? unavailable(completenessReason)
    : buildWholeRecordAlleleLandscape({
        alleles: completeAlleles,
        frequencyRows,
        sourceRecordCount: sourceRecords.length,
        frequencyRowsTruncated,
        purityByAllele,
      })

  let uniqueCarrierCount: number | null = null
  if (source.carriers_available) {
    const carrierRows = await queryRows(
      `
        SELECT uniqExact(sample_id) AS unique_carrier_count
        FROM lr_y1_carriers
        WHERE run_id = {runId:String} AND release = 'y1'
          AND cohort = {cohort:String} AND reference_genome = 'GRCh38'
          AND chrom = {chrom:String} AND source_variant_id IN {sourceIds:Array(String)}
      `,
      { runId: source.run_id, cohort, chrom: source.chrom, sourceIds }
    )
    uniqueCarrierCount = Number(carrierRows[0]?.unique_carrier_count || 0)
  }

  let wholeRecordGenotypeLandscape: any = unavailable('CARRIER_CALLS_NOT_AVAILABLE')
  if (
    !completenessReason &&
    source.carriers_available &&
    source.metadata_run_id &&
    sourceRecords.length === 1
  ) {
    try {
      const genotypeRows = await queryRows(
        `
        WITH sample_calls AS (
          SELECT sample_id, uniqExact(gt_alleles) AS genotype_count,
            uniqExact(gt_phased) AS phase_count, any(gt_alleles) AS allele_pair,
            any(gt_phased) AS phased
          FROM lr_y1_carriers
          WHERE run_id = {runId:String} AND release = 'y1'
            AND cohort = {cohort:String} AND reference_genome = 'GRCh38'
            AND chrom = {chrom:String} AND source_variant_id = {sourceVariantId:String}
          GROUP BY sample_id
        )
        SELECT ifNull(nullIf(m.superpopulation, ''), 'unknown') AS ancestry_group,
          ifNull(nullIf(m.sex, ''), 'unknown') AS sex,
          if(c.genotype_count = 0, [toUInt16(0), toUInt16(0)], c.allele_pair) AS allele_pair,
          count() AS people,
          countIf(c.genotype_count > 0 AND c.phased = 1) AS phased_people,
          countIf(c.genotype_count > 1 OR c.phase_count > 1
            OR (c.genotype_count > 0 AND length(c.allele_pair) != 2)
          ) AS invalid_people
        FROM lr_y1_sample_metadata AS m
        LEFT JOIN sample_calls AS c ON m.sample_id = c.sample_id
        WHERE m.metadata_run_id = {metadataRunId:String} AND m.release = 'y1'
          AND m.cohort = {cohort:String} AND m.reference_genome = 'GRCh38'
        GROUP BY ancestry_group, sex, allele_pair, c.phased
        ORDER BY ancestry_group, sex, allele_pair
        LIMIT {limit:UInt16}
      `,
        {
          runId: source.run_id,
          metadataRunId: source.metadata_run_id,
          cohort,
          chrom: source.chrom,
          sourceVariantId: sourceRecords[0].source_variant_id,
          limit: MAX_TR_LOCUS_GENOTYPE_GROUPS + 1,
        }
      )
      wholeRecordGenotypeLandscape = buildWholeRecordGenotypeLandscape({
        rows: genotypeRows,
        alleles: completeAlleles,
        expectedCalledAlleles: sourceRecords[0].an,
      })
    } catch {
      // Genotype calls are an optional, privacy-sensitive aggregate. A source
      // snapshot that cannot satisfy the exact join must not make the locus or
      // allelic landscape fail and must never fall back to raw carrier rows.
      wholeRecordGenotypeLandscape = unavailable('MATCHING_SAMPLE_METADATA_NOT_QUERYABLE')
    }
  } else if (!completenessReason && sourceRecords.length !== 1) {
    wholeRecordGenotypeLandscape = unavailable('MULTIPLE_SOURCE_RECORDS_NOT_RECONCILABLE')
  } else if (!completenessReason && source.carriers_available && !source.metadata_run_id) {
    wholeRecordGenotypeLandscape = unavailable('MATCHING_SAMPLE_METADATA_NOT_AVAILABLE')
  } else if (completenessReason) {
    wholeRecordGenotypeLandscape = unavailable(completenessReason)
  }

  let cursor = decodeTrAlleleCursor(after)
  if (after && !cursor) throw new Error('INVALID_TR_LOCUS_CURSOR')
  let selectedAlleleValid: boolean | null = null
  if (!after && selectedAllele) {
    const selected = cursorForSelectedAllelePage(selectedAllele, sourceRecords, first)
    if (!completenessReason) cursor = selected.cursor
    selectedAlleleValid = selected.valid
  }
  const pageStart = pageStartForCursor(cursor, completeAlleles)
  const pageRows = completeAlleles.slice(pageStart, pageStart + first)
  const hasNextPage = pageStart + first < completeAlleles.length

  const alleles = pageRows.map((row) => {
    const summary = summaries[sourceOrder.get(row.source_variant_id)!]
    const mc = parseSourceArray(summary.info.MC_allele)
    const alignedMc =
      mc && mc.length === summary.alt_count + 1 ? finiteNumber(mc[row.alt_index]) : null
    return {
      variant_id: browserVariantId(row.source_variant_id, row.alt_index),
      source_variant_id: row.source_variant_id,
      alt_index: row.alt_index,
      alt_count: summary.alt_count,
      ref: exactSequenceIndexWithinBound ? row.ref_allele || null : null,
      alt: exactSequenceIndexWithinBound ? row.alt || null : null,
      length: row.allele_length,
      repeat_count: alignedMc,
      repeat_count_source: repeatCountSource(alignedMc),
      motif_purity:
        purityByAllele.get(compactAlleleKey(row.source_variant_id, row.alt_index)) ?? null,
      freq: {
        all: { ac: row.ac, an: row.an, af: row.af },
        populations: frequencies.get(compactAlleleKey(row.source_variant_id, row.alt_index)) || [],
      },
    }
  })
  const finalAllele = alleles[alleles.length - 1]

  let selectedAlleleDetail = null
  let selectedAlleleUnavailableReason: string | null = null
  if (selectedAllele && selectedAlleleValid && completenessReason) {
    selectedAlleleUnavailableReason = completenessReason
  } else if (selectedAllele && selectedAlleleValid) {
    const match = /^(.*)~([1-9][0-9]*)$/.exec(selectedAllele)!
    const selectedRows = await queryRows(
      `
        SELECT source_variant_id, alt_index, ref_allele, alt, allele_length, ac, an, af,
          rsids, filters, cadd_phred, phylop, major_consequence,
          short_read_match_id, short_read_match_type, short_read_match_source
        FROM lr_y1_alleles
        WHERE run_id = {runId:String} AND release = 'y1'
          AND cohort = {cohort:String} AND reference_genome = 'GRCh38'
          AND chrom = {chrom:String} AND source_variant_id = {sourceVariantId:String}
          AND alt_index = {altIndex:UInt16}
        LIMIT 2
      `,
      {
        runId: source.run_id,
        cohort,
        chrom: source.chrom,
        sourceVariantId: match[1],
        altIndex: Number(match[2]),
      }
    )
    if (selectedRows.length !== 1) throw new Error('TR_LOCUS_INVARIANT')
    const row = selectedRows[0]
    const summary = summaries[sourceOrder.get(row.source_variant_id)!]
    const mc = parseSourceArray(summary.info.MC_allele)
    const ap = parseSourceArray(summary.info.AP_allele)
    const altIndex = Number(row.alt_index)
    const alignedMc = mc && mc.length === summary.alt_count + 1 ? finiteNumber(mc[altIndex]) : null
    const alignedPurity =
      ap && ap.length === summary.alt_count + 1 ? finiteNumber(ap[altIndex]) : null
    const candidateDetail = {
      variant_id: browserVariantId(row.source_variant_id, altIndex),
      source_variant_id: row.source_variant_id,
      alt_index: altIndex,
      alt_count: summary.alt_count,
      ref: row.ref_allele,
      alt: row.alt,
      length: finiteNumber(row.allele_length),
      repeat_count: alignedMc,
      repeat_count_source: repeatCountSource(alignedMc),
      motif_purity: alignedPurity,
      motif_purity_source: alignedPurity == null ? null : 'source_ap_allele',
      decomposition_status:
        locus.components.length === 1
          ? 'UNAVAILABLE_NO_DECOMPOSITION'
          : 'UNAVAILABLE_COMPOUND_LOCUS',
      decomposition_reason:
        locus.components.length === 1
          ? 'No admitted source decomposition is available for this exact allele'
          : 'Observed sequence tokens cannot be assigned to coordinate-defined source components',
      freq: {
        all: { ac: Number(row.ac), an: Number(row.an), af: Number(row.af) },
        populations: frequencies.get(compactAlleleKey(row.source_variant_id, altIndex)) || [],
      },
      rsids: Array.isArray(row.rsids) ? row.rsids : [],
      filters: Array.isArray(row.filters) ? row.filters : [],
      major_consequence: row.major_consequence || null,
      cadd_phred: finiteNumber(row.cadd_phred),
      phylop: finiteNumber(row.phylop),
      short_read_match_id: row.short_read_match_id || null,
      short_read_match_type: row.short_read_match_type || null,
      short_read_match_source: row.short_read_match_source || null,
      source_release: source.release,
      source_run_id: source.run_id,
    }
    if (selectedDetailWithinBound(candidateDetail)) {
      selectedAlleleDetail = candidateDetail
    } else {
      // Never include sequence content in an error or log message. The compact selected
      // node remains on its validated page, so identity and safe frequency metadata survive.
      selectedAlleleUnavailableReason = 'SELECTED_ALLELE_DETAIL_BYTE_BOUND_EXCEEDED'
    }
  }

  const deltaValues = completeAlleles.map((allele) => allele.allele_length!)
  const alignedSourceComponentCountsAvailable =
    locus.components.length === 1 &&
    summaries.every((summary) => {
      const mc = parseSourceArray(summary.info.MC_allele)
      if (!mc || mc.length !== summary.alt_count + 1) return false
      return Array.from({ length: summary.alt_count }, (_, index) =>
        finiteNumber(mc[index + 1])
      ).every((value) => value != null)
    })
  let componentMeasurementUnavailableReason = null
  if (!alignedSourceComponentCountsAvailable) {
    componentMeasurementUnavailableReason =
      locus.components.length === 1
        ? 'No complete aligned source component counts are available; exact repeat-count plots remain separately fail-closed'
        : 'Compound loci lack an admitted mapping from whole-record sequence to source components'
  }
  const envelopeStart0 = Math.min(...locus.components.map((component) => component.start0))
  const envelopeEnd0 = Math.max(...locus.components.map((component) => component.end0))
  const totalAlleles = sourceRecords.reduce((sum, record) => sum + record.alt_count, 0)

  return {
    id: locus.canonicalId,
    source_trid: locus.sourceTrid,
    reference_genome: 'GRCh38',
    chrom: locus.components[0].chrom,
    region: {
      chrom: locus.components[0].chrom,
      start0: envelopeStart0,
      end0: envelopeEnd0,
      size: envelopeEnd0 - envelopeStart0,
    },
    components: locus.components,
    motifs: Array.from(new Set(locus.components.map((component) => component.motif))),
    structure: summaries.length === 1 ? summaries[0].info.STRUC || null : null,
    lr_cohort: cohort,
    source_release: source.release,
    source_run_id: source.run_id,
    primary_database: source.database,
    source_records: sourceRecords,
    total_alleles: totalAlleles,
    exact_alt_count: totalAlleles,
    exact_alt_count_complete: !completenessReason,
    exact_alt_count_unavailable_reason: completenessReason,
    delta_min: deltaValues.length ? Math.min(...deltaValues) : null,
    delta_max: deltaValues.length ? Math.max(...deltaValues) : null,
    delta_unavailable_reason: completenessReason,
    called_allele_count: sourceRecords.length === 1 ? sourceRecords[0].an : null,
    called_sample_count:
      wholeRecordGenotypeLandscape.status === 'AVAILABLE'
        ? wholeRecordGenotypeLandscape.called_samples
        : null,
    unique_carrier_count: uniqueCarrierCount,
    sequences_available: !completenessReason,
    sequences_unavailable_reason: completenessReason,
    selected_allele_valid: selectedAllele ? Boolean(selectedAlleleValid) : null,
    selected_allele_unavailable_reason: selectedAlleleUnavailableReason,
    selected_allele: selectedAlleleDetail,
    whole_record_allele_landscape: wholeRecordAlleleLandscape,
    whole_record_genotype_landscape: wholeRecordGenotypeLandscape,
    component_measurement_available: alignedSourceComponentCountsAvailable,
    component_measurement_unavailable_reason: componentMeasurementUnavailableReason,
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
    `lr_tr_locus:v4:${cohort}:${source.database}:${source.run_id}:${
      source.metadata_run_id || 'no-metadata'
    }:${source.chrom}:${id}:${first}:${after || 'first'}:${selectedAllele || 'none'}`,
  { expiration: 300 }
)
