import { isAncillaryUnavailableForCohort } from './ancillary-availability'

describe('ancillary cohort availability', () => {
  test('AoU cannot resolve HGSVC/HPRC-only modalities', () => {
    expect(isAncillaryUnavailableForCohort('aou')).toBe(true)
  })

  test('the legacy/default HGSVC/HPRC path remains available', () => {
    expect(isAncillaryUnavailableForCohort('hgsvc_hprc')).toBe(false)
    expect(isAncillaryUnavailableForCohort(undefined)).toBe(false)
  })
})
