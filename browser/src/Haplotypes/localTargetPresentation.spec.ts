import {
  LOCAL_TARGET_LABEL_PANEL_WIDTH,
  LOCAL_TARGET_MOTIF_SEGMENT_POLYGONS_STROKED,
  LOCAL_TARGET_MOTIF_SEPARATOR_STYLE,
  localTargetBandBounds,
  localTargetMotifBoundaryLines,
  localTargetMotifSeparatorLayerProps,
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
      color: [20, 20, 20, 255],
      width: 1.5,
    })
  })

  test('places one full-height separator at every exact internal token boundary', () => {
    const lines = localTargetMotifBoundaryLines({
      weights: [3, 3, 3, 1],
      bandLeft: 100,
      bandRight: 200,
      yTop: 12,
      yBottom: 20,
    })

    expect(lines).toEqual([
      { sourcePosition: [130, 12, 0], targetPosition: [130, 20, 0] },
      { sourcePosition: [160, 12, 0], targetPosition: [160, 20, 0] },
      { sourcePosition: [190, 12, 0], targetPosition: [190, 20, 0] },
    ])
    expect(lines.flatMap((line) => [line.sourcePosition[0], line.targetPosition[0]]))
      .not.toContain(100)
    expect(lines.flatMap((line) => [line.sourcePosition[0], line.targetPosition[0]]))
      .not.toContain(200)
  })

  test('configures explicit separators as a dedicated overlay layer rather than polygon outlines', () => {
    const data = localTargetMotifBoundaryLines({
      weights: [1, 1],
      bandLeft: 0,
      bandRight: 80,
      yTop: 4,
      yBottom: 12,
    })
    const layerProps = localTargetMotifSeparatorLayerProps(data)

    expect(LOCAL_TARGET_MOTIF_SEGMENT_POLYGONS_STROKED).toBe(false)
    expect(layerProps.id).toBe('target-motif-separators')
    expect(layerProps.id).not.toBe('target-sequence-segments')
    expect(layerProps.data).toBe(data)
    expect(layerProps.getSourcePosition(data[0])).toEqual([40, 4, 0])
    expect(layerProps.getTargetPosition(data[0])).toEqual([40, 12, 0])
    expect(layerProps.getColor).toEqual([20, 20, 20, 255])
    expect(layerProps.getWidth).toBe(1.5)
    expect(layerProps.widthUnits).toBe('pixels')
    expect(layerProps.pickable).toBe(false)
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
