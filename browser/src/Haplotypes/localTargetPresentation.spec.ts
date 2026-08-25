import {
  LOCAL_TARGET_LABEL_PANEL_WIDTH,
  LOCAL_TARGET_MOTIF_SEPARATOR_STYLE,
  localTargetBandBounds,
  localTargetStripLayout,
  localTargetVariantColor,
  truncateLocalTargetLabel,
} from './localTargetPresentation'

describe('local tandem-repeat target presentation', () => {
  test('makes the motif display dominant without changing genomic coordinates', () => {
    expect(
      localTargetBandBounds({
        rawStart: 498,
        rawStop: 502,
        canvasWidth: 1_000,
        minimumBandFraction: 0.62,
      })
    ).toEqual({ bandLeft: 190, bandRight: 810 })
  })

  test('fades only non-TR evidence and leaves ordinary Haplotype View colors unchanged', () => {
    const fullColor: [number, number, number, number] = [20, 40, 60, 200]

    expect(localTargetVariantColor(fullColor, 'snv', true)).toEqual([20, 40, 60, 56])
    expect(localTargetVariantColor(fullColor, 'trv', true)).toBe(fullColor)
    expect(localTargetVariantColor(fullColor, 'SNV', false)).toBe(fullColor)
  })

  test('uses a readable local-only label rail and truncates with the full label available to tooltips', () => {
    expect(LOCAL_TARGET_LABEL_PANEL_WIDTH).toBeGreaterThanOrEqual(220)
    expect(truncateLocalTargetLabel('Cluster 12 · 323 copies', 32)).toBe('Cluster 12 · 323 copies')
    expect(truncateLocalTargetLabel('Haplotype group with a deliberately long label', 24)).toBe(
      'Haplotype group with a…'
    )
  })

  test('enlarges ordinary motif strips while compacting the four-strip mixed/unknown edge case', () => {
    expect(localTargetStripLayout(1)).toEqual({ stripHeight: 8, stripSpacing: 8 })
    expect(localTargetStripLayout(3)).toEqual({ stripHeight: 8, stripSpacing: 8 })
    expect(localTargetStripLayout(4)).toEqual({ stripHeight: 6, stripSpacing: 6 })
    expect(LOCAL_TARGET_MOTIF_SEPARATOR_STYLE).toEqual({
      color: [35, 35, 35, 220],
      width: 1,
    })
  })

  test('clamps a dominant target band at either canvas edge', () => {
    expect(
      localTargetBandBounds({
        rawStart: -10,
        rawStop: 10,
        canvasWidth: 500,
        minimumBandFraction: 0.6,
      })
    ).toEqual({ bandLeft: 0, bandRight: 300 })
    expect(
      localTargetBandBounds({
        rawStart: 490,
        rawStop: 510,
        canvasWidth: 500,
        minimumBandFraction: 0.6,
      })
    ).toEqual({ bandLeft: 200, bandRight: 500 })
  })
})
