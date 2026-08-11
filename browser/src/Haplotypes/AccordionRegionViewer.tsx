import React, { useContext, useMemo } from 'react'
import { RegionViewerContext } from '@gnomad/region-viewer'
import { AccordionCoordinateMapper } from './AccordionCoordinateMapper'
import AccordionContext from './AccordionContext'
import { createAccordionViewportScale } from './accordionViewportScale'

type AccordionRegionViewerProps = {
  mapper: AccordionCoordinateMapper
  originalRegion: { start: number; stop: number }
  children: React.ReactNode
  testId?: string
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
  testId,
}: AccordionRegionViewerProps) => {
  const baseContext = useContext(RegionViewerContext)
  const accordionContext = useMemo(() => ({ mapper }), [mapper])

  const overriddenContext = useMemo(() => {
    // Always provide an extrapolating view-domain scale. RegionViewer's default
    // scale clamps loaded-region positions outside the client viewport to its
    // edges, which creates false piles of offscreen lollipop marks at x=0/width.
    // Accordion phantom space is incorporated into the same scale when enabled.
    const customScale = createAccordionViewportScale(
      mapper,
      originalRegion,
      baseContext.centerPanelWidth
    )

    const isPositionDefined = (pos: number): boolean =>
      pos >= originalRegion.start && pos <= originalRegion.stop

    return {
      ...baseContext,
      scalePosition: customScale,
      isPositionDefined,
    }
  }, [baseContext, mapper, originalRegion])

  return (
    <RegionViewerContext.Provider value={overriddenContext}>
      <AccordionContext.Provider value={accordionContext}>
        {testId ? (
          <div data-testid={testId} style={{ width: '100%' }}>
            {children}
          </div>
        ) : (
          children
        )}
      </AccordionContext.Provider>
    </RegionViewerContext.Provider>
  )
}

export default AccordionRegionViewer
