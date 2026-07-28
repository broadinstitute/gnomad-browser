import {
  ancillaryDecision,
  filterAvailableMethylationSampleIds,
  isAncillaryUnavailableForCohort,
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
    expect(() => typedMethylationStatus('unavailable_unknown')).toThrow('Unknown methylation availability status')
  })
})
