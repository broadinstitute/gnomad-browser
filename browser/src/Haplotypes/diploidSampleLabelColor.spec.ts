import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'
import { getDiploidSampleLabelColor } from './diploidSampleLabelColor'

const samples = (...sampleIds: string[]) => sampleIds.map((sample_id) => ({ sample_id }))

const metadata = (entries: [string, string][]): SampleMetadataMap =>
  new Map(
    entries.map(([sampleId, superpopulation]) => [sampleId, { subpopulation: '', superpopulation }])
  )

const NEUTRAL = [40, 40, 40, 255]

describe('getDiploidSampleLabelColor', () => {
  test('uses canonical SAS orange for HG03874', () => {
    expect(getDiploidSampleLabelColor(samples('HG03874'), metadata([['HG03874', 'SAS']]))).toEqual([
      254, 154, 16, 255,
    ])
  })

  test('uses the canonical color for another recognized population', () => {
    expect(getDiploidSampleLabelColor(samples('HG00096'), metadata([['HG00096', 'EUR']]))).toEqual([
      106, 166, 206, 255,
    ])
  })

  test('colors a composite row when every sample has the same population', () => {
    expect(
      getDiploidSampleLabelColor(
        samples('HG03874', 'HG04042'),
        metadata([
          ['HG03874', 'SAS'],
          ['HG04042', 'SAS'],
        ])
      )
    ).toEqual([254, 154, 16, 255])
  })

  test('keeps a mixed-population composite row neutral', () => {
    expect(
      getDiploidSampleLabelColor(
        samples('HG03874', 'HG00096'),
        metadata([
          ['HG03874', 'SAS'],
          ['HG00096', 'EUR'],
        ])
      )
    ).toEqual(NEUTRAL)
  })

  test('keeps missing metadata neutral', () => {
    expect(
      getDiploidSampleLabelColor(samples('HG03874', 'missing'), metadata([['HG03874', 'SAS']]))
    ).toEqual(NEUTRAL)
  })

  test('keeps unrecognized metadata neutral', () => {
    expect(
      getDiploidSampleLabelColor(samples('HG03874'), metadata([['HG03874', 'UNKNOWN']]))
    ).toEqual(NEUTRAL)
  })
})
