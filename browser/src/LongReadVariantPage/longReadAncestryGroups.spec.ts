import { SUPERPOPULATION_COLORS } from '../Haplotypes/colors'
import {
  addLongReadAncestryGroupNames,
  longReadAncestryGroupDisplayId,
  longReadAncestryGroupDisplayName,
  normalizeLongReadAncestryGroupDisplayId,
  LONG_READ_ANCESTRY_GROUP_LEGEND_IDS,
} from './longReadAncestryGroups'

describe('long-read genetic ancestry group display', () => {
  test.each(['oth', 'OTH', 'rmi', 'RMI'])('normalizes %s to the rmi display identity', (id) => {
    expect(normalizeLongReadAncestryGroupDisplayId(id)).toBe('rmi')
    expect(longReadAncestryGroupDisplayId(id)).toBe('RMI')
    expect(longReadAncestryGroupDisplayName(id)).toBe('Remaining individuals')
  })

  test('preserves raw IDs and values when adding display names', () => {
    const groups = [
      { id: 'oth', ac: 2, an: 10 },
      { id: 'rmi', ac: 3, an: 12 },
      { id: 'afr', ac: 4, an: 14 },
    ]

    expect(addLongReadAncestryGroupNames(groups)).toEqual([
      { ...groups[0], name: 'Remaining individuals' },
      { ...groups[1], name: 'Remaining individuals' },
      { ...groups[2], name: 'African/African American' },
    ])
    expect(groups.map((group) => group.id)).toEqual(['oth', 'rmi', 'afr'])
  })

  test('publishes only rmi in the LR legend and retains the legacy color', () => {
    expect(LONG_READ_ANCESTRY_GROUP_LEGEND_IDS).toContain('RMI')
    expect(LONG_READ_ANCESTRY_GROUP_LEGEND_IDS).not.toContain('OTH')
    expect(SUPERPOPULATION_COLORS.RMI).toBe(SUPERPOPULATION_COLORS.OTH)
  })

  test('retains sex-stratum labels without changing their IDs', () => {
    expect(longReadAncestryGroupDisplayName('oth_XX')).toBe('XX')
    expect(longReadAncestryGroupDisplayName('rmi_XY')).toBe('XY')
  })
})
