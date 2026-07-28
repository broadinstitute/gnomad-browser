import { getRowBackgroundRects } from './haplotypeBackgrounds'

describe('getRowBackgroundRects', () => {
  const regionStart = 100
  const regionStop = 1000

  test('uses the visible region for a haplotype whose variants have narrower bounds', () => {
    const group = { start: 300, stop: 700 }

    const backgrounds = getRowBackgroundRects(
      { type: 'group', group, isChild: false },
      25,
      regionStart,
      regionStop
    )

    expect(backgrounds).toEqual([
      {
        groupStart: regionStart,
        groupStop: regionStop,
        rowY: 25,
        color: [240, 240, 240, 255],
        group,
      },
    ])
  })

  test('uses the visible region for similarity cluster backgrounds', () => {
    expect(getRowBackgroundRects({ type: 'cluster' }, 50, regionStart, regionStop)).toEqual([
      {
        groupStart: regionStart,
        groupStop: regionStop,
        rowY: 50,
        color: [215, 225, 240, 255],
        group: null,
      },
    ])
  })

  test('uses the visible region for both non-ROH diplotype strand backgrounds', () => {
    const diplotype = { start: 300, stop: 700, is_roh: false }

    const backgrounds = getRowBackgroundRects(
      { type: 'diplotype', group: diplotype },
      75,
      regionStart,
      regionStop
    )

    expect(
      backgrounds.map(({ groupStart, groupStop, rowY, height }) => ({
        groupStart,
        groupStop,
        rowY,
        height,
      }))
    ).toEqual([
      { groupStart: regionStart, groupStop: regionStop, rowY: 73, height: 19 },
      { groupStart: regionStart, groupStop: regionStop, rowY: 96, height: 19 },
    ])
  })

  test('uses one full-region merged background for ROH diplotypes', () => {
    const diplotype = { start: 300, stop: 700, is_roh: true }

    const backgrounds = getRowBackgroundRects(
      { type: 'diplotype', group: diplotype },
      75,
      regionStart,
      regionStop
    )

    expect(backgrounds).toHaveLength(1)
    expect(backgrounds[0]).toMatchObject({
      groupStart: regionStart,
      groupStop: regionStop,
      rowY: 73,
      height: 40,
      group: diplotype,
    })
  })
})
