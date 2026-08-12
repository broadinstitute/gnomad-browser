import { describe, expect, test } from '@jest/globals'
import { filterGroupsToRegionalDeviationSamples } from './methylationOutlierFilter'

const groups = [
  { id: 'A', samples: [{ sample_id: 'ranked' }] },
  { id: 'B', samples: [{ sample_id: 'detail-only' }] },
]

describe('regional methylation deviation filter', () => {
  test('is opt-in and uses only immutable API-ranked identities', () => {
    expect(filterGroupsToRegionalDeviationSamples(groups, ['ranked'], false)).toEqual(groups)
    expect(
      filterGroupsToRegionalDeviationSamples(groups, ['ranked'], true).map((group) => group.id)
    ).toEqual(['A'])
  })

  test('does not admit a sample merely because a detail row could be loaded', () => {
    const detailRows = [{ sample: 'detail-only' }]
    expect(detailRows).toHaveLength(1)
    expect(filterGroupsToRegionalDeviationSamples(groups, [], true)).toEqual([])
  })
})
