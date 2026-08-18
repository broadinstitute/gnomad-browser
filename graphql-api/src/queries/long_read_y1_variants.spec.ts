import { jest } from '@jest/globals'
import { buildVariantsAndCarrierMap } from './haplotype-grouping'

const mockQuery = jest.fn()
jest.mock('../clickhouse', () => ({
  y1ClickhouseClient: { query: (...args: any[]) => mockQuery(...args) },
}))

import {
  browserVariantId,
  fetchY1VariantById,
  fetchY1VariantsByRegion,
  mapY1RowToGraphQL,
  sourceIdentityFromBrowserId,
} from './long_read_y1_variants'

describe('Y1 long-read browser identity', () => {
  it('keeps the exact source ID separate from the ALT-specific browser ID', () => {
    const sourceVariantId = 'chr22-20147573-INS-2_2'
    const id = browserVariantId(sourceVariantId, 3)

    expect(id).toBe('chr22-20147573-INS-2_2~3')
    expect(sourceIdentityFromBrowserId(id)).toEqual({ sourceVariantId, altIndex: 3 })
  })

  it('treats an unsuffixed exact source ID as ALT 1', () => {
    expect(sourceIdentityFromBrowserId('chr22-20000208-C-T')).toEqual({
      sourceVariantId: 'chr22-20000208-C-T',
      altIndex: 1,
    })
  })

  it('normalizes source-summary motifs for exact-ALT decomposition', () => {
    const variant = mapY1RowToGraphQL({
      source_variant_id: 'chr22-100-TRV-9', alt_index: 1, alt_count: 4, chrom: 'chr22',
      position: 100, reference_end: 108, xpos: 2200000100,
      ref_allele: 'ACAGCAG', alt: 'ACAGCAGCAG', allele_type: 'trv',
      filters: [], ac: 2, an: 10, af: 0.2, allele_length: 3,
      tr_motifs: ' CAG, CCG ',
    }, 'hgsvc_hprc', [], 'run-1')

    expect(variant.motifs).toEqual(['CAG', 'CCG'])
    expect(variant.alt_count).toBe(4)
  })

  it('joins primary source-summary motifs when fetching one routed variant', async () => {
    mockQuery.mockReset()
    mockQuery.mockImplementationOnce(() => Promise.resolve({ json: async () => [] }))

    await fetchY1VariantById(
      'chr22-20460608-TRV-136~1', 'hgsvc_hprc', 'run-1', 'chr22'
    )

    expect(mockQuery).toHaveBeenCalledTimes(1)
    const [request] = mockQuery.mock.calls[0] as any[]
    expect(request.query).toContain('LEFT JOIN')
    expect(request.query).toContain('lr_y1_summaries')
    expect(request.query).toContain("JSONExtractString(source_info_json, 'MOTIFS')")
    expect(request.query_params).toMatchObject({
      runId: 'run-1', cohort: 'hgsvc_hprc', chrom: 'chr22',
      sourceVariantId: 'chr22-20460608-TRV-136', altIndex: 1,
    })
  })

  it('preserves signed and zero Y1 allele lengths without coercing missingness to zero', () => {
    const row = {
      source_variant_id: 'chr22-100-TRV-2', alt_index: 1, chrom: 'chr22',
      position: 100, reference_end: 110, xpos: 2200000100, ref_allele: 'AAAA',
      alt: 'A', allele_type: 'trv', filters: [], ac: 2, an: 10, af: 0.2,
    }
    const map = (alleleLength: unknown) =>
      mapY1RowToGraphQL({ ...row, allele_length: alleleLength }, 'hgsvc_hprc', [], 'run-1').length

    expect(map(-3)).toBe(-3)
    expect(map(0)).toBe(0)
    expect(map(null)).toBeNull()
  })

  it('preserves structured VCF strand and per-variant phase-set identity in REST carriers', () => {
    const row = (position: number, carriers: any[]) => ({
      source_variant_id: `chr22-${position}-A-G`, alt_index: 1, alt_count: 2,
      position, reference_end: position, ref: 'A', alt: 'G', rsid: '',
      info_AF: 0.2, info_AC: 2, info_AN: 10, allele_type: 'snv', allele_length: 0,
      carriers,
    })
    const payload = buildVariantsAndCarrierMap([
      row(100, [['sample:with-colon', 1, 'ps-a', 2], ['sample:with-colon', 2, 'ps-b', 2]]),
      row(200, [['sample:with-colon', 1, null, 2], ['sample:with-colon', 2, 'ps-b', 2]]),
    ], 'chr22')

    expect(payload.soa_variants.source_variant_id).toEqual([
      'chr22-100-A-G',
      'chr22-200-A-G',
    ])
    expect(payload.soa_variants.alt_index).toEqual([1, 1])
    expect(payload.soa_variants.alt_count).toEqual([2, 2])
    expect(payload.carrier_variant_indices).toEqual({
      'sample:with-colon:1': [0, 1],
      'sample:with-colon:2': [0, 1],
    })
    expect(payload.carriers).toEqual([
      {
        sample_id: 'sample:with-colon', vcf_strand: 1, phase_set: null,
        genotype_ploidy: 2, phase_sets: ['ps-a'], variant_indices: [0, 1],
        phase_set_by_variant: [
          { variant_index: 0, phase_set: 'ps-a' },
          { variant_index: 1, phase_set: null },
        ],
      },
      {
        sample_id: 'sample:with-colon', vcf_strand: 2, phase_set: 'ps-b',
        genotype_ploidy: 2, phase_sets: ['ps-b'], variant_indices: [0, 1],
        phase_set_by_variant: [
          { variant_index: 0, phase_set: 'ps-b' },
          { variant_index: 1, phase_set: 'ps-b' },
        ],
      },
    ])
  })

  it('uses the discovered AoU run ID and never queries carriers', async () => {
    mockQuery.mockReset()
    mockQuery.mockImplementation(() => Promise.resolve({ json: async () => [] }))

    await fetchY1VariantsByRegion(
      { chrom: 'chr22', start: 100, stop: 200 },
      'aou',
      'discovered-aou-run'
    )

    expect(mockQuery).toHaveBeenCalledTimes(2)
    for (const [call] of mockQuery.mock.calls as any[]) {
      expect(call.query).not.toContain('lr_y1_carriers')
      expect(call.query_params).toMatchObject({
        runId: 'discovered-aou-run', cohort: 'aou', chrom: 'chr22',
      })
    }
  })

  it.each([
    {
      label: 'expanded Y1 TR allele',
      sourceVariantId: 'chr22-20337607-TRV-329',
      alleleType: 'trv', position: 20337607, referenceEnd: 20337936,
      ref: 'A'.repeat(330), alt: 'A'.repeat(6440), alleleLength: 6110,
      expectedEnd: 20337936,
    },
    {
      label: 'sequence-resolved Y1 DUP encoded at an insertion anchor',
      sourceVariantId: 'chr22-20339401-INS-1617',
      alleleType: 'dup', position: 20339401, referenceEnd: 20341018,
      ref: 'T', alt: `T${'A'.repeat(1617)}`, alleleLength: 1617,
      expectedEnd: 20339401,
    },
    {
      label: 'symbolic tandem DUP with SVLEN-like stale reference_end',
      sourceVariantId: 'chr22-20345000-DUP-TANDEM',
      alleleType: 'dup_tandem', position: 20345000, referenceEnd: 20353000,
      ref: 'N', alt: '<DUP:TANDEM>', alleleLength: 8000,
      expectedEnd: 20345000,
    },
    {
      label: 'true reference-spanning deletion',
      sourceVariantId: 'chr22-20346000-DEL-120',
      alleleType: 'del', position: 20346000, referenceEnd: 20346120,
      ref: 'A'.repeat(121), alt: 'A', alleleLength: -120,
      expectedEnd: 20346120,
    },
  ])('uses the same bounded reference interval and canonical ALT ID for $label', ({
    sourceVariantId, alleleType, position, referenceEnd, ref, alt, alleleLength, expectedEnd,
  }) => {
    const altIndex = 2
    const common = {
      source_variant_id: sourceVariantId,
      alt_index: altIndex,
      alt_count: 3,
      position,
      reference_end: referenceEnd,
      ref_allele: ref,
      alt,
      allele_type: alleleType,
      allele_length: alleleLength,
    }
    const summary = mapY1RowToGraphQL({
      ...common,
      chrom: 'chr22',
      xpos: 2200000000 + Number(position),
      filters: [],
      ac: 2,
      an: 10,
      af: 0.2,
    }, 'hgsvc_hprc', [], 'run-1')
    const haplotype = buildVariantsAndCarrierMap([{
      ...common,
      ref: common.ref_allele,
      variant_id: browserVariantId(sourceVariantId, altIndex),
      rsid: '',
      info_AF: 0.2,
      info_AC: 2,
      info_AN: 10,
      carriers: [['sample-1', 1]],
    }], 'chr22').variants[0]

    expect({ id: haplotype.variant_id, start: haplotype.pos, stop: haplotype.end }).toEqual({
      id: summary.variant_id,
      start: summary.pos,
      stop: summary.end,
    })
    expect(haplotype.end).toBe(expectedEnd)
    expect(haplotype.allele_length).toBe(alleleLength)
    expect(haplotype).toMatchObject({
      source_variant_id: sourceVariantId,
      alt_index: altIndex,
      alt_count: 3,
    })
  })
})
