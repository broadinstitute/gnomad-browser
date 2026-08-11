import type { ScalePosition } from '@gnomad/region-viewer'
import { AccordionCoordinateMapper } from './AccordionCoordinateMapper'

export const createAccordionViewportScale = (
  mapper: AccordionCoordinateMapper,
  viewRegion: { start: number; stop: number },
  centerPanelWidth: number
): ScalePosition => {
  const visualSpan = Math.max(mapper.totalVisualLength, 1)
  const pxPerUnit = centerPanelWidth > 0 ? centerPanelWidth / visualSpan : 1

  const scale = ((pos: number): number => {
    const syntheticPos = mapper.getSyntheticCoordinate(pos, 0)
    return (syntheticPos - viewRegion.start) * pxPerUnit
  }) as ScalePosition

  scale.invert = (px: number): number => {
    const syntheticPos = viewRegion.start + px / pxPerUnit
    return mapper.visualToGenomic(syntheticPos)
  }

  return scale
}
