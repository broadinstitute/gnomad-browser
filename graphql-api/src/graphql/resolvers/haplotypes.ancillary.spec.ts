import {
  ancillaryDecision,
  filterAvailableMethylationSampleIds,
  isAncillaryUnavailableForCohort,
  phasedMethylationCapability,
  sampleTotalMethylationRecords,
  sourcePhasedEvaluationScope,
  sourcePhasedMethylationRecords,
  typedMethylationStatus,
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

  test('Y1 fails closed before querying legacy ancillary tables', () => {
    expect(isAncillaryUnavailableForCohort('hgsvc_hprc', true)).toBe(true)
    expect(isAncillaryUnavailableForCohort(undefined, true)).toBe(true)
  })

  test('mixed mode does not imply capability without a successful modality preflight', () => {
    expect(ancillaryDecision('hgsvc_hprc', 'coverage', true, true)).toEqual({
      available: false,
      source: 'UNAVAILABLE',
      reason: 'Not allowlisted',
    })
  })

  test('AoU remains summary-only even when mixed mode is requested', () => {
    expect(ancillaryDecision('aou', 'str_histogram', true, true)).toEqual({
      available: false,
      source: 'UNAVAILABLE',
      reason: 'AoU is summary-only',
    })
  })

  test('mQTL is never authorized in mixed mode', () => {
    expect(ancillaryDecision('hgsvc_hprc', 'mqtl', true, true).available).toBe(false)
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

  test('phased methylation fails closed without inferring source haplotype orientation', () => {
    expect(phasedMethylationCapability('hgsvc_hprc')).toEqual({
      data_layer: 'SOURCE_PHASED',
      available: false,
      joinable_to_vcf: false,
      status: 'UNAVAILABLE_ORIENTATION_UNCONFIRMED',
      orientation_status: 'UNCONFIRMED',
      reason: expect.stringContaining('orientation is confirmed'),
    })
  })

  test('retained source-phased evaluation remains available but not joinable', () => {
    expect(phasedMethylationCapability('hgsvc_hprc', true)).toEqual({
      data_layer: 'SOURCE_PHASED',
      available: true,
      joinable_to_vcf: false,
      status: 'AVAILABLE_ORIENTATION_UNCONFIRMED',
      orientation_status: 'UNCONFIRMED',
      reason: expect.stringContaining('visual evaluation only'),
    })
  })

  test('source-phased records preserve labels and never acquire VCF phase fields', () => {
    expect(sourcePhasedMethylationRecords([
      { chr: 'chr22', pos1: 47040001, pos2: 47040002, methylation: 25, coverage: 4, source_haplotype: 1 },
      { chr: 'chr22', pos1: 47040003, pos2: 47040004, methylation: 75, coverage: 8, source_haplotype: 2 },
    ])).toEqual([
      expect.objectContaining({ sample: 'HG00097', data_layer: 'SOURCE_PHASED', source_haplotype: 'HAP1', vcf_strand: null, phase_set: null }),
      expect.objectContaining({ sample: 'HG00097', data_layer: 'SOURCE_PHASED', source_haplotype: 'HAP2', vcf_strand: null, phase_set: null }),
    ])
    expect(() => sourcePhasedMethylationRecords([{ source_haplotype: 3 }])).toThrow('Unexpected source haplotype')
  })

  test('source-phased evaluation rejects cross-sample-by-design and out-of-region requests', () => {
    expect(sourcePhasedEvaluationScope('22', 47040000, 47050000)).toEqual({
      chrom: 'chr22', start: 47040000, stop: 47050000, sample_id: 'HG00097',
    })
    expect(() => sourcePhasedEvaluationScope('chr21', 47040000, 47050000)).toThrow('restricted')
    expect(() => sourcePhasedEvaluationScope('chr22', 47039999, 47050000)).toThrow('restricted')
    expect(() => sourcePhasedEvaluationScope('chr22', 47040000, 47050001)).toThrow('restricted')
  })

  test('AoU phased methylation is typed summary-only and never falls back to HGSVC', () => {
    expect(phasedMethylationCapability('aou')).toEqual({
      data_layer: 'SOURCE_PHASED',
      available: false,
      joinable_to_vcf: false,
      status: 'UNAVAILABLE_AOU_SUMMARY_ONLY',
      orientation_status: 'UNCONFIRMED',
      reason: expect.stringContaining('never used as a fallback'),
    })
  })
})
