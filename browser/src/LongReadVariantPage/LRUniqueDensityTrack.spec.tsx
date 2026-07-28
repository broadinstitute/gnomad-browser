import React from 'react'
import renderer from 'react-test-renderer'
import { RegionViewerContext } from '@gnomad/region-viewer'

import { allLongReadVariantTypesSelected } from './longReadVariantTypes'
import LRUniqueDensityTrack from './LRUniqueDensityTrack'

const regionViewerProps = {
  centerPanelWidth: 100,
  isPositionDefined: () => true,
  leftPanelWidth: 80,
  regions: [{ start: 1, stop: 100 }],
  rightPanelWidth: 0,
  scalePosition: Object.assign((position: number) => position, {
    invert: (x: number) => x,
  }),
}

describe('LRUniqueDensityTrack layout', () => {
  test('uses the full 45px track height for SVG and bar geometry', () => {
    const tree = renderer.create(
      <RegionViewerContext.Provider value={regionViewerProps}>
        <LRUniqueDensityTrack
          variants={[
            { pos: 10, allele_type: 'snv', short_read_match_id: null },
            { pos: 11, allele_type: 'snv', short_read_match_id: 'matched' },
          ]}
          typeFilters={allLongReadVariantTypesSelected()}
          onTypeFiltersChange={() => {}}
        />
      </RegionViewerContext.Provider>
    ).root

    const svg = tree.findByType('svg')
    expect(svg.props).toMatchObject({ height: 45, width: 100 })

    const bars = tree.findAllByType('rect')
    expect(bars).toHaveLength(2)
    expect(bars[0].props).toMatchObject({ x: 10, y: 0, width: 1.5, height: 45 })
    expect(bars[1].props).toMatchObject({ x: 10, y: 22.5, width: 1.5, height: 22.5 })
  })
})
