import { describe, expect, test } from '@jest/globals'
import { AccordionCoordinateMapper } from './AccordionCoordinateMapper'
import { createAccordionViewportScale } from './accordionViewportScale'

const region = { start: 100, stop: 200 }

describe('accordion graphical viewport scale', () => {
  test('maps the selected domain to the panel and extrapolates offscreen positions', () => {
    const mapper = new AccordionCoordinateMapper(region, [], false)
    const scale = createAccordionViewportScale(mapper, region, 1000)

    expect(scale(100)).toBe(0)
    expect(scale(150)).toBe(500)
    expect(scale(200)).toBe(1000)
    expect(scale(50)).toBe(-500)
    expect(scale(250)).toBe(1500)
    expect(scale.invert(750)).toBe(175)
  })

  test('retains phantom space and snaps inversion inside its gap to the breakpoint', () => {
    const mapper = new AccordionCoordinateMapper(region, [{
      pos: 150,
      allele_type: 'ins',
      allele_length: 100,
    } as any], true)
    const scale = createAccordionViewportScale(mapper, region, 1000)
    const locus = mapper.getPhantomLoci()[0]
    const phantomStart = scale(150)
    const pxPerSyntheticUnit = 1000 / mapper.totalVisualLength
    const insidePhantom = phantomStart + (locus.maxPhantomLength * pxPerSyntheticUnit) / 2

    expect(mapper.hasPhantomRegions).toBe(true)
    expect(scale(200)).toBeCloseTo(1000)
    expect(scale.invert(insidePhantom)).toBe(150)
  })
})
