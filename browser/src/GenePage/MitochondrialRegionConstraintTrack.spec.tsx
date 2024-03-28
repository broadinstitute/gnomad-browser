import React from 'react'
import renderer from 'react-test-renderer'
import { expect, test } from '@jest/globals'
import MitochondrialRegionConstraintTrack, {
  ProteinMitochondrialRegionConstraint,
  RNAMitochondrialRegionConstraint,
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

const geneStart = 123
const geneStop = 1999
const exons: Exon[] = [
  { feature_type: 'CDS', start: 123, stop: 234 },
  { feature_type: 'UTR', start: 235, stop: 999 },
  { feature_type: 'CDS', start: 1000, stop: 1999 },
]

test('track for protein gene has no unexpected changes', () => {
  const constraintRegions: ProteinMitochondrialRegionConstraint[] = [
    { protein_residue_start: 5, protein_residue_end: 10, oe: 0.45, oe_lower: 0.37, oe_upper: 0.47 },
    {
      protein_residue_start: 15,
      protein_residue_end: 20,
      oe: 0.55,
      oe_lower: 0.47,
      oe_upper: 0.67,
    },
  ]
  const tree = renderer.create(
    <RegionViewerContext.Provider value={childProps}>
      <MitochondrialRegionConstraintTrack
        geneSymbol="MT-ATP6"
        geneStart={geneStart}
        geneStop={geneStop}
        constraintRegions={constraintRegions}
        exons={exons}
      />
    </RegionViewerContext.Provider>
  )
  expect(tree).toMatchSnapshot()
})

test('track for rRNA gene has no unexpected changes', () => {
  const constraintRegions: RNAMitochondrialRegionConstraint[] = [
    { mt_dna_start: 555, mt_dna_end: 666, oe: 0.45, oe_lower: 0.37, oe_upper: 0.47 },
    { mt_dna_start: 777, mt_dna_end: 888, oe: 0.56, oe_lower: 0.52, oe_upper: 0.59 },
  ]
  const tree = renderer.create(
    <RegionViewerContext.Provider value={childProps}>
      <MitochondrialRegionConstraintTrack
        geneSymbol="MT-RNR1"
        geneStart={geneStart}
        geneStop={geneStop}
        constraintRegions={constraintRegions}
        exons={exons}
      />
    </RegionViewerContext.Provider>
  )
  expect(tree).toMatchSnapshot()
})

test('track for tRNA gene has no unexpected changes', () => {
  const tree = renderer.create(
    <RegionViewerContext.Provider value={childProps}>
      <MitochondrialRegionConstraintTrack
        geneSymbol="MT-TT"
        geneStart={geneStart}
        geneStop={geneStop}
        constraintRegions={null}
        exons={exons}
      />
    </RegionViewerContext.Provider>
  )
  expect(tree).toMatchSnapshot()
})
