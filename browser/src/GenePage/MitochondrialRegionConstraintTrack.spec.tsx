import React from 'react'
import renderer from 'react-test-renderer'
import { expect, test } from '@jest/globals'
import MitochondrialRegionConstraintTrack, {
  MitochondrialConstraintRegion,
} from './MitochondrialRegionConstraintTrack'
import { Exon } from '../TranscriptPage/TranscriptPage'
// @ts-expect-error
import { RegionViewerContext } from '@gnomad/region-viewer'

const childProps = {
  centerPanelWidth: 3,
  isPositionDefined: true,
  leftPanelWidth: 4,
  regions: [],
  rightPanelWidth: 5,
  scalePosition: (i: number) => i,
}

const exons: Exon[] = [{ feature_type: 'CDS', start: 123, stop: 1999 }]
const constraintRegions: MitochondrialConstraintRegion[] = [
  { start: 555, stop: 666, oe: 0.45, oe_lower: 0.37, oe_upper: 0.47 },
  { start: 777, stop: 888, oe: 0.56, oe_lower: 0.52, oe_upper: 0.59 },
]

describe('MitochondrialRegionConstraintTrack for a protein gene', () => {
  test('track has no unexpected changes when gene has constraint', () => {
    const tree = renderer.create(
      <RegionViewerContext.Provider value={childProps}>
        <MitochondrialRegionConstraintTrack
          geneSymbol="MT-ATP6"
          constraintRegions={constraintRegions}
          exons={exons}
        />
      </RegionViewerContext.Provider>
    )
    expect(tree).toMatchSnapshot()
  })

  test('track has no unexpected changes when no constraint for gene', () => {
    const tree = renderer.create(
      <RegionViewerContext.Provider value={childProps}>
        <MitochondrialRegionConstraintTrack
          geneSymbol="MT-ATP6"
          constraintRegions={null}
          exons={exons}
        />
      </RegionViewerContext.Provider>
    )
    expect(tree).toMatchSnapshot()
  })
})

describe('MitochondrialRegionConstraintTrack for an RNA gene', () => {
  test('track has no unexpected changes when gene has constraint', () => {
    const tree = renderer.create(
      <RegionViewerContext.Provider value={childProps}>
        <MitochondrialRegionConstraintTrack
          geneSymbol="MT-RNR1"
          constraintRegions={constraintRegions}
          exons={exons}
        />
      </RegionViewerContext.Provider>
    )
    expect(tree).toMatchSnapshot()
  })

  test('track has no unexpected changes when no constraint for gene', () => {
    const tree = renderer.create(
      <RegionViewerContext.Provider value={childProps}>
        <MitochondrialRegionConstraintTrack
          geneSymbol="MT-RNR1"
          constraintRegions={null}
          exons={exons}
        />
      </RegionViewerContext.Provider>
    )
    expect(tree).toMatchSnapshot()
  })
})
