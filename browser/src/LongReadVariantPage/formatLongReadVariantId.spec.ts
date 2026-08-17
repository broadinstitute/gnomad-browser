import { formatLongReadVariantId } from './formatLongReadVariantId'

describe('formatLongReadVariantId', () => {
  test.each([
    ['chr22-100-A-T', '22-100-A-T'],
    ['CHR22-101-AT-A', '22-101-AT-A'],
    ['chr4-39348424-DEL-55', '4-39348424-DEL-55'],
    ['chr4-39348424-TRV-55', '4-39348424-TRV-55'],
    ['chr4-39348424-TRV-55~49', '4-39348424-TRV-55~49'],
    ['4-39348424-TRV-55~49', '4-39348424-TRV-55~49'],
    ['source-chr-event', 'source-chr-event'],
  ])('formats %s as %s', (rawId, displayId) => {
    expect(formatLongReadVariantId(rawId)).toBe(displayId)
  })
})
