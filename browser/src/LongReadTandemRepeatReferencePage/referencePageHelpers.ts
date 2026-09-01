import { LongReadTrReferenceCohortResult, LongReadTrReferenceRow, ReferenceFilters } from './types'

export const PAGE_SIZE = 50

export const defaultReferenceFilters: ReferenceFilters = {
  query: '',
  chrom: 'all',
  match: 'all',
  sort: 'id',
}

const chromosomeOrder = (chrom: string) => {
  if (/^\d+$/.test(chrom)) return Number(chrom)
  if (chrom.toUpperCase() === 'X') return 23
  if (chrom.toUpperCase() === 'Y') return 24
  return 25
}

export const isExact = (result: LongReadTrReferenceCohortResult) =>
  result.status === 'EXACT_UNIQUE' && result.candidates.length === 1

export const isMultiple = (result: LongReadTrReferenceCohortResult) => result.status === 'AMBIGUOUS'

export const isUnavailableOrAmbiguous = (result: LongReadTrReferenceCohortResult) =>
  result.status.includes('UNAVAILABLE') || result.status.includes('AMBIGUOUS')

const matchesStatus = (row: LongReadTrReferenceRow, match: ReferenceFilters['match']) => {
  const hgsvcExact = isExact(row.hgsvc_hprc)
  const aouExact = isExact(row.aou)
  if (match === 'all') return true
  if (match === 'either') return hgsvcExact || aouExact
  if (match === 'both') return hgsvcExact && aouExact
  if (match === 'hgsvc_hprc_only') return hgsvcExact && !aouExact
  if (match === 'aou_only') return aouExact && !hgsvcExact
  const isDurableNonmatch = (result: LongReadTrReferenceCohortResult) =>
    ['COORDINATE_MISMATCH', 'ORIENTATION_DIAGNOSTIC', 'MOTIF_MISMATCH', 'SOURCE_ABSENT'].includes(
      result.status
    )
  if (match === 'none') return isDurableNonmatch(row.hgsvc_hprc) && isDurableNonmatch(row.aou)
  if (match === 'multiple') return isMultiple(row.hgsvc_hprc) || isMultiple(row.aou)
  return isUnavailableOrAmbiguous(row.hgsvc_hprc) || isUnavailableOrAmbiguous(row.aou)
}

const searchableText = (row: LongReadTrReferenceRow) =>
  [
    row.short_record.id,
    row.short_record.gene.symbol,
    row.short_record.main_reference_region.reference_genome,
    row.short_record.main_reference_region.chrom,
    row.short_record.main_reference_region.start,
    row.short_record.main_reference_region.stop,
    row.short_record.reference_repeat_unit,
    ...row.short_record.associated_diseases.flatMap((disease) => [
      disease.symbol,
      disease.name,
      disease.omim_id,
    ]),
    ...row.hgsvc_hprc.candidates.map((candidate) => candidate.canonical_id),
    ...row.aou.candidates.map((candidate) => candidate.canonical_id),
    ...row.hgsvc_hprc.diagnostic_candidates.map((candidate) => candidate.canonical_id),
    ...row.aou.diagnostic_candidates.map((candidate) => candidate.canonical_id),
  ]
    .filter((value) => value !== null && value !== undefined)
    .join(' ')
    .toLocaleLowerCase()

const statusRank = (result: LongReadTrReferenceCohortResult) => {
  if (isExact(result)) return 0
  if (isMultiple(result)) return 1
  const rank: Record<LongReadTrReferenceCohortResult['status'], number> = {
    EXACT_UNIQUE: 0,
    AMBIGUOUS: 1,
    COORDINATE_MISMATCH: 2,
    ORIENTATION_DIAGNOSTIC: 3,
    MOTIF_MISMATCH: 4,
    SOURCE_ABSENT: 5,
    UNAVAILABLE: 6,
  }
  return rank[result.status]
}

const compareRows = (
  a: LongReadTrReferenceRow,
  b: LongReadTrReferenceRow,
  sort: ReferenceFilters['sort']
) => {
  if (sort === 'genomic') {
    return (
      chromosomeOrder(a.short_record.main_reference_region.chrom) -
        chromosomeOrder(b.short_record.main_reference_region.chrom) ||
      a.short_record.main_reference_region.start - b.short_record.main_reference_region.start ||
      a.short_record.main_reference_region.stop - b.short_record.main_reference_region.stop
    )
  }
  if (sort === 'motif') {
    return (
      a.short_record.reference_repeat_unit.length - b.short_record.reference_repeat_unit.length ||
      a.short_record.reference_repeat_unit.localeCompare(b.short_record.reference_repeat_unit)
    )
  }
  if (sort === 'hgsvc_hprc' || sort === 'aou') {
    return (
      statusRank(a[sort]) - statusRank(b[sort]) ||
      b[sort].candidates.length - a[sort].candidates.length
    )
  }
  return a.short_record.id.localeCompare(b.short_record.id, undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

export const filterAndSortReferenceRows = (
  rows: LongReadTrReferenceRow[],
  filters: ReferenceFilters
) => {
  const query = filters.query.trim().toLocaleLowerCase()
  return rows
    .filter(
      (row) =>
        (filters.chrom === 'all' ||
          row.short_record.main_reference_region.chrom === filters.chrom) &&
        matchesStatus(row, filters.match) &&
        (!query || searchableText(row).includes(query))
    )
    .sort(
      (a, b) =>
        compareRows(a, b, filters.sort) || a.short_record.id.localeCompare(b.short_record.id)
    )
}

export const availableChromosomes = (rows: LongReadTrReferenceRow[]) =>
  Array.from(new Set(rows.map((row) => row.short_record.main_reference_region.chrom))).sort(
    (a, b) => chromosomeOrder(a) - chromosomeOrder(b) || a.localeCompare(b)
  )
