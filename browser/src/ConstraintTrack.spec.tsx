import { regionsInExons, GenericRegion } from './ConstraintTrack'
import { exonFactory } from './__factories__/Gene'
import { Exon } from './TranscriptPage/TranscriptPage'

test('regionsInExons', () => {
  const testCases = [
    {
      regions: [
        { start: 2, stop: 4, i: 1 },
        { start: 6, stop: 8, i: 2 },
      ],
      exons: [exonFactory.build({ start: 2, stop: 6 }), exonFactory.build({ start: 6, stop: 9 })],
      expected: [
        { start: 2, stop: 4, i: 1, unclamped_start: 2, unclamped_stop: 4 },
        { start: 6, stop: 8, i: 2, unclamped_start: 6, unclamped_stop: 8 },
      ],
    },
    {
      regions: [
        { start: 2, stop: 4, i: 1 },
        { start: 6, stop: 8, i: 2 },
      ],
      exons: [exonFactory.build({ start: 1, stop: 8 })],
      expected: [
        { start: 2, stop: 4, i: 1, unclamped_start: 2, unclamped_stop: 4 },
        { start: 6, stop: 8, i: 2, unclamped_start: 6, unclamped_stop: 8 },
      ],
    },
    {
      regions: [
        { start: 2, stop: 4, i: 1 },
        { start: 6, stop: 8, i: 2 },
      ],
      exons: [
        exonFactory.build({ start: 1, stop: 3 }),
        exonFactory.build({ start: 3, stop: 5 }),
        exonFactory.build({ start: 5, stop: 9 }),
      ],
      expected: [
        { start: 2, stop: 3, i: 1, unclamped_start: 2, unclamped_stop: 4 },
        { start: 3, stop: 4, i: 1, unclamped_start: 2, unclamped_stop: 4 },
        { start: 6, stop: 8, i: 2, unclamped_start: 6, unclamped_stop: 8 },
      ],
    },
    {
      regions: [
        { start: 2, stop: 4, misc_field_1: 2, misc_field_2: 4 },
        { start: 6, stop: 8, misc_field_1: 6, misc_field_2: 8 },
      ],
      exons: [
        exonFactory.build({ start: 1, stop: 3 }),
        exonFactory.build({ start: 3, stop: 5 }),
        exonFactory.build({ start: 5, stop: 9 }),
      ],
      expected: [
        {
          start: 2,
          stop: 3,
          misc_field_1: 2,
          misc_field_2: 4,
          unclamped_start: 2,
          unclamped_stop: 4,
        },
        {
          start: 3,
          stop: 4,
          misc_field_1: 2,
          misc_field_2: 4,
          unclamped_start: 2,
          unclamped_stop: 4,
        },
        {
          start: 6,
          stop: 8,
          misc_field_1: 6,
          misc_field_2: 8,
          unclamped_start: 6,
          unclamped_stop: 8,
        },
      ],
    },
  ]

  testCases.forEach(({ regions, exons, expected }) => {
    expect(regionsInExons(regions as GenericRegion[], exons as Exon[])).toEqual(expected)
  })
})
