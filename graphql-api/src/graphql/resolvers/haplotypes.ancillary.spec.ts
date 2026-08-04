import {
  ancillaryDecision,
  filterAvailableMethylationSampleIds,
  isAncillaryUnavailableForCohort,
  phasedMethylationCapability,
  sampleTotalMethylationRecords,
  sourcePhasedEvaluationScope,
  sourcePhasedMethylationRecords,
  typedMethylationStatus,
  validateSourcePhasedMethylationPhysicalState,
} from './ancillary-availability'

describe('ancillary cohort availability', () => {
  test('AoU cannot resolve HGSVC/HPRC-only modalities in either mode', () => {
    expect(isAncillaryUnavailableForCohort('aou', false)).toBe(true)
    expect(isAncillaryUnavailableForCohort('aou', true)).toBe(true)
  })

  test('the legacy/default HGSVC/HPRC path remains available when Y1 is disabled', () => {
    expect(isAncillaryUnavailableForCohort('hgsvc_hprc', false)).toBe(false)
    expect(isAncillaryUnavailableForCohort(undefined, false)).toBe(false)
  })

  test.each(['coverage', 'str_histogram', 'methylation'] as const)(
    'Y1 %s is unavailable without a uniquely pinned ancillary run',
    (modality) => {
      expect(ancillaryDecision('hgsvc_hprc', modality, true)).toEqual({
        available: false,
        source: 'UNAVAILABLE',
        reason: 'Optional table is unavailable',
      })
      expect(isAncillaryUnavailableForCohort('hgsvc_hprc', true, modality)).toBe(true)
    }
  )

  test('AoU remains summary-only in the sole Y1 mode', () => {
    expect(ancillaryDecision('aou', 'str_histogram', true)).toEqual({
      available: false,
      source: 'UNAVAILABLE',
      reason: 'AoU is summary-only',
    })
  })

  test('mQTL is never authorized in Y1', () => {
    expect(ancillaryDecision('hgsvc_hprc', 'mqtl', true).available).toBe(false)
  })

  test('canonical methylation requests contain only available identities', () => {
    const roster = [
      { sample_id: 'available', available: true, status: 'AVAILABLE_COMPLETE' as const, reason: null },
      { sample_id: 'excluded', available: false, status: 'UNAVAILABLE_NO_ASSAY_SOURCE' as const, reason: 'No assay source' },
    ]
    expect(filterAvailableMethylationSampleIds(['excluded', 'available'], roster)).toEqual(['available'])
    expect(filterAvailableMethylationSampleIds(undefined, roster)).toEqual(['available'])
  })

  test('methylation availability reasons are a closed typed contract', () => {
    expect(typedMethylationStatus('unavailable_no_chr22')).toBe('UNAVAILABLE_NO_CHR22')
    expect(typedMethylationStatus('unavailable_source_marked_skip')).toBe('UNAVAILABLE_SOURCE_MARKED_SKIP')
    expect(typedMethylationStatus('unavailable_no_contig')).toBe('UNAVAILABLE_NO_CONTIG')
    expect(typedMethylationStatus('unavailable_orientation_unconfirmed')).toBe('UNAVAILABLE_ORIENTATION_UNCONFIRMED')
    expect(typedMethylationStatus('unavailable_aou_summary_only')).toBe('UNAVAILABLE_AOU_SUMMARY_ONLY')
    expect(() => typedMethylationStatus('unavailable_unknown')).toThrow('Unknown methylation availability status')
  })

  test('types compatibility methylation records as sample totals without a phased mapping', () => {
    expect(sampleTotalMethylationRecords([{
      chr: 'chr22', pos1: 100, pos2: 101, sample: 'sample-1', methylation: 42,
    }])).toEqual([{
      chr: 'chr22', pos1: 100, pos2: 101, sample: 'sample-1', methylation: 42,
      data_layer: 'SAMPLE_TOTAL', source_haplotype: null, vcf_strand: null, phase_set: null,
    }])
  })

  test('phased methylation fails closed without an admitted source-labelled route', () => {
    expect(phasedMethylationCapability('hgsvc_hprc', null)).toEqual({
      data_layer: 'SOURCE_PHASED',
      available: false,
      joinable_to_vcf: false,
      status: 'UNAVAILABLE_ORIENTATION_UNCONFIRMED',
      orientation_status: 'UNCONFIRMED',
      phase_set_semantics: 'SOURCE_TRACK_HAS_NO_PHASE_SET',
      route_run_id: null,
      source_sample_ids: [],
      reason: expect.stringContaining('no admitted serving route'),
    })
  })

  test('an admitted source-only product stays distinct from browser VCF and phase blocks', () => {
    const route = {
      run_id: 'source-only-v1',
      receipt: {
        source_sample_ids: ['HG00097'],
        missing_orientation_evidence: 'approval binding mapping to exact browser VCF',
      },
    } as any
    expect(phasedMethylationCapability('hgsvc_hprc', route)).toEqual({
      data_layer: 'SOURCE_PHASED',
      available: true,
      joinable_to_vcf: false,
      status: 'AVAILABLE_ORIENTATION_UNCONFIRMED',
      orientation_status: 'UNCONFIRMED',
      phase_set_semantics: 'SOURCE_TRACK_HAS_NO_PHASE_SET',
      route_run_id: 'source-only-v1',
      source_sample_ids: ['HG00097'],
      reason: expect.stringContaining('exact browser VCF'),
    })
  })

  test('source-phased records preserve labels and never acquire VCF phase fields', () => {
    expect(sourcePhasedMethylationRecords([
      { chr: 'chr22', pos1: 47040001, pos2: 47040002, methylation: 25, sample: 'HG00097', coverage: 4, source_haplotype: 1 },
      { chr: 'chr22', pos1: 47040003, pos2: 47040004, methylation: 75, sample: 'HG00097', coverage: 8, source_haplotype: 2 },
    ])).toEqual([
      expect.objectContaining({ sample: 'HG00097', data_layer: 'SOURCE_PHASED', source_haplotype: 'HAP1', vcf_strand: null, phase_set: null }),
      expect.objectContaining({ sample: 'HG00097', data_layer: 'SOURCE_PHASED', source_haplotype: 'HAP2', vcf_strand: null, phase_set: null }),
    ])
    expect(() => sourcePhasedMethylationRecords([{ source_haplotype: 3 }])).toThrow('Unexpected source haplotype')
  })

  test('source-phased scope admits only receipt samples, nonempty contigs, and bounded ranges', () => {
    const route = {
      receipt: {
        contigs: [{ chrom: 'chr22' }],
        source_sample_ids: ['HG00097'],
      },
    } as any
    expect(sourcePhasedEvaluationScope('22', 47040000, 47050000, 'HG00097', route)).toEqual({
      chrom: 'chr22', start: 47040000, stop: 47050000, sample_id: 'HG00097',
    })
    expect(() => sourcePhasedEvaluationScope('chr21', 1, 2, 'HG00097', route)).toThrow('unavailable')
    expect(() => sourcePhasedEvaluationScope('chr22', 1, 100002, 'HG00097', route)).toThrow('100 kb')
    expect(() => sourcePhasedEvaluationScope('chr22', 1, 2, 'missing', route)).toThrow('sample')
  })

  test('source-labelled physical admission requires the exact schema and receipt partitions', () => {
    const route = {
      receipt: { detail_rows: 12, contigs: [{ chrom: 'chr22', rows: 12 }] },
    } as any
    const state = {
      tables: [{
        name: 'lr_y1_methylation_source_haplotype_presentation',
        engine: 'MergeTree',
        partition_key: 'chrom',
        sorting_key: '(chrom, pos1, sample_id, source_haplotype, stable_key)',
        create_table_query: `CONSTRAINT source_haplotype_is_1_or_2 CHECK source_haplotype IN (1, 2)
          CONSTRAINT one_base_bed_interval CHECK pos2 = pos1 + 1
          CONSTRAINT methylation_percentage CHECK methylation >= 0 AND methylation <= 100`,
      }],
      columns: [
        ['stable_key', 'FixedString(64)'], ['chrom', 'LowCardinality(String)'],
        ['pos1', 'UInt32'], ['pos2', 'UInt32'],
        ['sample_id', 'LowCardinality(String)'], ['source_haplotype', 'UInt8'],
        ['methylation', 'Float32'], ['coverage', 'UInt32'],
      ].map(([name, type], index) => ({ name, type, position: index + 1 })),
      parts: [{ chrom: 'chr22', rows: 12 }],
    }
    expect(() => validateSourcePhasedMethylationPhysicalState(route, state)).not.toThrow()
    expect(() => validateSourcePhasedMethylationPhysicalState(route, {
      ...state,
      columns: state.columns.map((row) => row.name === 'coverage' ? { ...row, type: 'UInt16' } : row),
    })).toThrow('column shape')
    expect(() => validateSourcePhasedMethylationPhysicalState(route, {
      ...state,
      parts: [{ chrom: 'chr22', rows: 11 }],
    })).toThrow('partitions')
  })

  test('AoU phased methylation is typed summary-only and never falls back to HGSVC', () => {
    expect(phasedMethylationCapability('aou')).toEqual({
      data_layer: 'SOURCE_PHASED',
      available: false,
      joinable_to_vcf: false,
      status: 'UNAVAILABLE_AOU_SUMMARY_ONLY',
      orientation_status: 'UNCONFIRMED',
      phase_set_semantics: 'SOURCE_TRACK_HAS_NO_PHASE_SET',
      route_run_id: null,
      source_sample_ids: [],
      reason: expect.stringContaining('never used as a fallback'),
    })
  })
})
