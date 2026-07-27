import { isAncillaryUnavailableForCohort } from './ancillary-availability'

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
})
