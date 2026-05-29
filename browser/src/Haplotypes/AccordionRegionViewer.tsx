import React, { useContext, useMemo } from 'react'
import { RegionViewerContext } from '@gnomad/region-viewer'
import type { ScalePosition } from '@gnomad/region-viewer'
import { AccordionCoordinateMapper } from './AccordionCoordinateMapper'
import AccordionContext from './AccordionContext'

type AccordionRegionViewerProps = {
  mapper: AccordionCoordinateMapper
  originalRegion: { start: number; stop: number }
  children: React.ReactNode
}

/**
 * Context interceptor that sits inside an existing RegionViewer and overrides
 * scalePosition/isPositionDefined to account for accordion phantom regions.
 *
 * When the mapper has no phantom regions (toggle off), the overridden
 * scalePosition is equivalent to the base — all existing tracks work unchanged.
 *
 * Only tracks that render *into* phantom space (DeckGLLollipopTrack,
 * LongReadVariantTrack) consume AccordionContext to get the mapper directly.
 */
const AccordionRegionViewer = ({
  mapper,
  originalRegion,
  children,
}: AccordionRegionViewerProps) => {
  const baseContext = useContext(RegionViewerContext)

  const overriddenContext = useMemo(() => {
    if (!mapper.hasPhantomRegions) {
      // No phantom regions — pass through unchanged
      return baseContext
    }

    // Build a wrapped scalePosition that maps genomic -> synthetic -> pixels.
    // The base scalePosition maps the synthetic region [viewStart, viewStart + totalVisualLength]
    // to pixels. We need it to map from the *synthetic* domain produced by the
    // parent RegionViewer. But the parent RegionViewer was given the original
    // genomic region, not the synthetic one.
    //
    // Since we can't change the parent RegionViewer's region, we need to
    // compute the pixel mapping ourselves. The base scalePosition maps
    // [originalRegion.start, originalRegion.stop] -> [0, centerPanelWidth].
    // We need to map [originalRegion.start, originalRegion.start + totalVisualLength]
    // -> [0, centerPanelWidth].
    //
    // Strategy: compute a scale factor. The original region spans
    // (stop - start) in genomic coords. With accordion, the visual span is
    // totalVisualLength. All positions get compressed by the ratio.
    const genomicSpan = originalRegion.stop - originalRegion.start
    const visualSpan = mapper.totalVisualLength
    const compressionRatio = genomicSpan / visualSpan
    const pxPerUnit = baseContext.centerPanelWidth / visualSpan

    const customScale = ((pos: number): number => {
      const syntheticPos = mapper.getSyntheticCoordinate(pos, 0)
      const offset = syntheticPos - originalRegion.start
      return offset * pxPerUnit
    }) as ScalePosition

    customScale.invert = (px: number): number => {
      const offset = px / pxPerUnit
      const syntheticPos = originalRegion.start + offset
      return mapper.visualToGenomic(syntheticPos)
    }

    const isPositionDefined = (pos: number): boolean => {
      return pos >= originalRegion.start && pos <= originalRegion.stop
    }

    return {
      ...baseContext,
      scalePosition: customScale,
      isPositionDefined,
    }
  }, [baseContext, mapper, originalRegion])

  return (
    <RegionViewerContext.Provider value={overriddenContext}>
      <AccordionContext.Provider value={{ mapper }}>
        {children}
      </AccordionContext.Provider>
    </RegionViewerContext.Provider>
  )
}

export default AccordionRegionViewer
