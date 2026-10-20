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
  // A cohort counts as lacking the match only when it durably does not match; an unavailable or
  // ambiguous result asserts no absence.
  const isDurableNonmatch = (result: LongReadTrReferenceCohortResult) =>
    ['COORDINATE_MISMATCH', 'ORIENTATION_DIAGNOSTIC', 'MOTIF_MISMATCH', 'SOURCE_ABSENT'].includes(
      result.status
    )
  if (match === 'all') return true
  if (match === 'either') return hgsvcExact || aouExact
  if (match === 'both') return hgsvcExact && aouExact
  if (match === 'hgsvc_hprc_only') return hgsvcExact && isDurableNonmatch(row.aou)
  if (match === 'aou_only') return aouExact && isDurableNonmatch(row.hgsvc_hprc)
  if (match === 'none') return isDurableNonmatch(row.hgsvc_hprc) && isDurableNonmatch(row.aou)
  if (match === 'multiple') return isMultiple(row.hgsvc_hprc) || isMultiple(row.aou)
  return isUnavailableOrAmbiguous(row.hgsvc_hprc) || isUnavailableOrAmbiguous(row.aou)
}

// Folds the ways the page writes a coordinate into one form, so a coordinate typed or pasted as
// the table shows it (chrX:25,013,649–25,013,697 in the short-read column,
// chrX:25,013,649–25,013,697 · NGC for a long-read locus) matches: no thousands separators, and
// ':', '–' and ' · ' all become '-', as in the locus ids.
const foldCoordinateFormatting = (text: string) =>
  text
    .toLocaleLowerCase()
    .replace(/(\d),(?=\d)/g, '$1')
    .replace(/\s*·\s*|[:–]/g, '-')

// A long-read locus id, and each of its components as the table writes them, with 'chr'.
const searchableLocusIds = (canonicalId: string) => [
  canonicalId,
  ...canonicalId.split('+').map((component) => `chr${component}`),
]

const searchableText = (row: LongReadTrReferenceRow) => {
  const region = row.short_record.main_reference_region
  const cohortResults = [row.hgsvc_hprc, row.aou]
  return foldCoordinateFormatting(
    [
      row.short_record.id,
      row.short_record.gene.symbol,
      region.reference_genome,
      region.chrom,
      region.start,
      // The one-based start, as other sites such as UCSC write it.
      region.start + 1,
      region.stop,
      `chr${region.chrom}:${region.start}–${region.stop}`,
      row.short_record.reference_repeat_unit,
      ...row.short_record.associated_diseases.flatMap((disease) => [
        disease.symbol,
        disease.name,
        disease.omim_id,
      ]),
      ...cohortResults.flatMap((result) =>
        result.candidates.flatMap((candidate) => searchableLocusIds(candidate.canonical_id))
      ),
      ...cohortResults.flatMap((result) =>
        result.diagnostic_candidates.flatMap(({ canonical_id, ordered_component }) => [
          ...searchableLocusIds(canonical_id),
          `chr${ordered_component.chrom}:${ordered_component.start0}–${ordered_component.end0} · ${ordered_component.motif}`,
        ])
      ),
    ]
      .filter((value) => value !== null && value !== undefined)
      .join(' ')
  )
}

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
  if (sort === 'hgsvc_hprc' || sort === 'aou') return statusRank(a[sort]) - statusRank(b[sort])
  // The Known STR ID sort is the tie-breaker every sort ends with.
  return 0
}

// Known STR IDs in natural order, so ATXN2 comes before ATXN10.
const compareShortRecordIds = (a: LongReadTrReferenceRow, b: LongReadTrReferenceRow) =>
  a.short_record.id.localeCompare(b.short_record.id, undefined, {
    numeric: true,
    sensitivity: 'base',
  }) || a.short_record.id.localeCompare(b.short_record.id)

export const filterAndSortReferenceRows = (
  rows: LongReadTrReferenceRow[],
  filters: ReferenceFilters
) => {
  const query = foldCoordinateFormatting(filters.query.trim())
  return rows
    .filter(
      (row) =>
        (filters.chrom === 'all' ||
          row.short_record.main_reference_region.chrom === filters.chrom) &&
        matchesStatus(row, filters.match) &&
        (!query || searchableText(row).includes(query))
    )
    .sort((a, b) => compareRows(a, b, filters.sort) || compareShortRecordIds(a, b))
}

export const availableChromosomes = (rows: LongReadTrReferenceRow[]) =>
  Array.from(new Set(rows.map((row) => row.short_record.main_reference_region.chrom))).sort(
    (a, b) => chromosomeOrder(a) - chromosomeOrder(b) || a.localeCompare(b)
  )
