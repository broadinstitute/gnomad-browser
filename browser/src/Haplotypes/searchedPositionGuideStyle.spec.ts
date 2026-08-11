import { SEARCHED_POSITION_GUIDE_STYLE } from './searchedPositionGuideStyle'

describe('searched position guide style', () => {
  test('uses a thin, muted guide that remains perceptible across haplotype rows', () => {
    expect(SEARCHED_POSITION_GUIDE_STYLE).toEqual({
      color: [74, 112, 150, 96],
      width: 1,
    })

    const alpha = SEARCHED_POSITION_GUIDE_STYLE.color[3]
    expect(alpha).toBeGreaterThanOrEqual(80)
    expect(alpha).toBeLessThan(128)
  })
})
