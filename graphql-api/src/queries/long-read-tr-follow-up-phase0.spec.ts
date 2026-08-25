import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { parseTrLocusId } from '../../../dataset-metadata/longReadTrLocusId'
import { classifyExactShortTandemRepeatCatalogContext } from './short-tandem-repeat-queries'

jest.mock('../elasticsearch', () => ({ catchNotFound: (error: unknown) => error }))

// Frozen, aggregate-only Phase 0 characterization. Intentional source or catalog changes
// must explicitly regenerate and review this fixture rather than silently widening identity.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fixture = require('./__fixtures__/long-read-tr-follow-up-phase0.json')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const crosswalk = require('../../config/long-read-tr-reference-crosswalk.json')

const sha256 = (value: string | Buffer) => crypto.createHash('sha256').update(value).digest('hex')
const caseById = (id: string) => fixture.cases.find((item: any) => item.id === id)

describe('long-read TR follow-up Phase 0 fixture freeze', () => {
  test('pins the clean implementation baseline and complete 78/51/58 reconciliation', () => {
    expect(fixture.baseline).toEqual({
      head: '2b23cad116c4fe7e2bda3558db4c43b61f08b1cb',
      branch: 'gnomad-lr',
      initial_status: 'clean',
    })
    expect(fixture.reconciliation).toEqual({
      catalog_rows: 78,
      exact_unique: { hgsvc_hprc: 51, aou: 58 },
      absent_exact: { hgsvc_hprc: 27, aou: 20 },
    })
    expect(crosswalk.reconciliation).toEqual(fixture.reconciliation)
    expect(crosswalk.rows).toHaveLength(78)
  })

  test('binds representative fixtures to the reviewed compact crosswalk bytes', () => {
    const crosswalkPath = path.resolve(
      __dirname,
      '../../config/long-read-tr-reference-crosswalk.json'
    )
    expect(sha256(fs.readFileSync(crosswalkPath))).toBe(fixture.inputs.crosswalk_sha256)
    expect(crosswalk.catalog.compact_sha256).toBe(fixture.inputs.catalog_compact_sha256)

    const currentRows = new Map(crosswalk.rows.map((row: any) => [row.short.id, row]))
    expect(fixture.cases.map((item: any) => item.id)).toEqual([
      'EIF4A3',
      'HTT',
      'ATXN1',
      'RFC1',
      'STARD7',
      'COMP',
      'NOTCH2NLC',
      'BEAN1',
      'YEATS2',
      'AR',
    ])
    fixture.cases.forEach((item: any) => {
      expect(currentRows.get(item.id)).toEqual(
        expect.objectContaining({
          short: item.short,
          cohorts: item.cohorts,
          distribution_receipt: expect.objectContaining({ sha256: expect.any(String) }),
        })
      )
    })
  })

  test.each(['EIF4A3', 'HTT', 'ATXN1', 'RFC1', 'STARD7', 'COMP', 'NOTCH2NLC'])(
    'replays the exact stored-coordinate and motif matcher for %s',
    (id) => {
      const item = caseById(id)
      const cohort = ['COMP', 'NOTCH2NLC'].includes(id) ? 'aou' : 'hgsvc_hprc'
      const candidate = item.cohorts[cohort].candidates[0]
      const parsed = parseTrLocusId(candidate.canonical_id)!
      const result = classifyExactShortTandemRepeatCatalogContext([item.short], parsed.components)
      expect(result.status).toBe('EXACT_UNIQUE')
      expect(result.reason_code).toBeNull()
      expect(result.candidates[0].component_index).toBe(candidate.matched_component_index)
      expect(result.candidates[0].reference_region_index).toBe(
        candidate.matched_reference_region_index
      )
    }
  )

  test.each(['BEAN1', 'YEATS2', 'AR'])('keeps the reviewed near-match %s fail-closed', (id) => {
    const item = caseById(id)
    const result = classifyExactShortTandemRepeatCatalogContext(
      [item.short],
      item.diagnostic_components
    )
    expect(result).toEqual({
      status: 'NONE',
      reason_code: 'NO_EXACT_COMPONENT',
      candidates: [],
    })
    expect(item.cohorts.hgsvc_hprc.status).toBe('NONE')
    expect(item.cohorts.aou.status).toBe('NONE')
  })

  test('freezes the scientific edge distinctions used by later phases', () => {
    const eif4a3 = caseById('EIF4A3')
    expect(
      eif4a3.short.repeat_units.find(
        (unit: any) => unit.repeat_unit === eif4a3.short.reference_repeat_unit
      ).classification
    ).toBe('benign')
    expect(
      eif4a3.short.repeat_units.find((unit: any) => unit.repeat_unit === 'CCTCGCTGCGCCGCTGCCGA')
        .classification
    ).toBe('pathogenic')
    expect(caseById('RFC1').short.repeat_units).toContainEqual({
      repeat_unit: 'AAAAG',
      classification: 'benign',
    })
    expect(caseById('STARD7').short.repeat_units).toContainEqual({
      repeat_unit: 'AAAAT',
      classification: 'benign',
    })
    expect(caseById('ATXN1').short.reference_repeat_unit).toBe('TGC')

    const httCandidate = caseById('HTT').cohorts.hgsvc_hprc.candidates[0]
    const httComponents = parseTrLocusId(httCandidate.canonical_id)!.components
    expect(httComponents.filter((component) => component.motif === 'CCG')).toEqual([
      { chrom: '4', start0: 3074939, end0: 3074966, motif: 'CCG' },
      { chrom: '4', start0: 3075029, end0: 3075040, motif: 'CCG' },
    ])
    expect(caseById('COMP').short.associated_diseases).toHaveLength(2)
    expect(caseById('NOTCH2NLC').short.associated_diseases).toHaveLength(2)
    expect(caseById('COMP').cohorts.hgsvc_hprc.status).toBe('NONE')
    expect(caseById('COMP').cohorts.aou.status).toBe('EXACT_UNIQUE')
    expect(caseById('NOTCH2NLC').cohorts.hgsvc_hprc.status).toBe('NONE')
    expect(caseById('NOTCH2NLC').cohorts.aou.status).toBe('EXACT_UNIQUE')
    expect(caseById('BEAN1').cohorts.aou.reason_code).toBe('REGION_EQUAL_MOTIF_MISMATCH')
    expect(caseById('YEATS2').cohorts.aou.reason_code).toBe('REGION_EQUAL_MOTIF_MISMATCH')
    expect(caseById('AR').cohorts.aou.reason_code).toBe('OVERLAP_ONLY')
  })

  test.each([
    'duplicate_ordered_component',
    'duplicate_catalog_exact_key',
    'duplicate_reference_region',
  ])('replays synthetic ambiguity %s', (id) => {
    const item = fixture.synthetic_cases.find((candidate: any) => candidate.id === id)
    const result = classifyExactShortTandemRepeatCatalogContext(
      item.catalog_records,
      item.components
    )
    expect(result.status).toBe(item.expected_status)
    expect(result.reason_code).toBe(item.expected_reason_code)
    expect(result.candidates.length).toBeGreaterThan(1)
  })

  test('freezes containing-locus multiplicity separately from component matching', () => {
    const item = fixture.synthetic_cases.find(
      (candidate: any) => candidate.id === 'multiple_containing_loci'
    )
    expect(item.expected_status).toBe('MULTIPLE')
    expect(item.expected_reason_code).toBe('MULTIPLE_CONTAINING_LR_LOCI')
    expect(new Set(item.candidate_canonical_ids).size).toBe(2)
  })

  test('pins aggregate distribution digests and observed size maxima without carrier data', () => {
    const inventory = fixture.distribution_inventory
    expect(fixture.inputs.privacy).toMatch(/no sample IDs or carrier rows/i)
    expect(fixture.inputs.distribution_concrete_index).toBe(
      'gnomad_v3_short_tandem_repeats-2026-07-29--20-42'
    )
    expect(fixture.inputs.distribution_index_uuid).toBe('-I0qNVPKSF-xUsIMbCZbqQ')
    expect(inventory.row_count).toBe(78)
    expect(inventory.rows).toHaveLength(78)
    expect(sha256(JSON.stringify(inventory.rows))).toBe(inventory.rows_sha256)
    expect(inventory.rows.map((row: any) => row.id)).toEqual(
      crosswalk.rows.map((row: any) => row.short.id).sort()
    )
    const inventoryById = new Map(inventory.rows.map((row: any) => [row.id, row]))
    expect(
      crosswalk.rows
        .map((row: any) => {
          const expected: any = inventoryById.get(row.short.id)
          return row.distribution_receipt.sha256 === expected.sha256 &&
            row.distribution_receipt.serialized_bytes === expected.json_bytes_compact &&
            row.distribution_receipt.allele_source_rows === expected.allele_rows &&
            row.distribution_receipt.genotype_source_rows === expected.genotype_rows &&
            row.distribution_receipt.allele_bins === expected.allele_bins &&
            row.distribution_receipt.genotype_bins === expected.genotype_bins
            ? null
            : row.short.id
        })
        .filter(Boolean)
    ).toEqual([])
    expect(crosswalk.distribution.limits).toEqual({
      max_serialized_bytes: 2 * 1024 * 1024,
      max_total_bins: 20000,
      max_allele_source_rows: 1000,
      max_genotype_source_rows: 1000,
    })
    expect(inventory.rows.every((row: any) => /^[0-9a-f]{64}$/.test(row.sha256))).toBe(true)
    expect(inventory.summary).toEqual({
      min_json_bytes_compact: 13219,
      median_json_bytes_compact: 114506,
      p95_json_bytes_compact_index_73_of_78: 525348,
      max_json_bytes_compact: 928685,
      max_json_bytes_locus: 'RFC1',
      max_allele_rows: 620,
      max_allele_rows_locus: 'RFC1',
      max_genotype_rows: 740,
      max_genotype_rows_locus: 'RFC1',
      max_allele_bins: 4953,
      max_allele_bins_locus: 'RFC1',
      max_genotype_bins: 6907,
      max_genotype_bins_locus: 'RFC1',
      max_total_bins: 11860,
      max_total_bins_locus: 'RFC1',
    })
    const focusedIds = new Set(fixture.cases.map((item: any) => item.id))
    expect(inventory.rows.filter((row: any) => focusedIds.has(row.id))).toHaveLength(10)
  })
})
