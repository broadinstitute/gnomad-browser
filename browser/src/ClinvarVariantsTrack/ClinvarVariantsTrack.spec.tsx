import { describe, expect, test, it } from '@jest/globals'
import 'jest-styled-components'
import clinvarVariantFactory from '../__factories__/ClinvarVariant'
import { ClinvarVariant } from '../VariantPage/VariantPage'
import React from 'react'
import renderer from 'react-test-renderer'
import ClinvarVariantTrack from './ClinvarVariantTrack'
import { RegionViewerContext } from '@gnomad/region-viewer'
import { Transcript } from '../TranscriptPage/TranscriptPage'
import transcriptFactory from '../__factories__/Transcript'

describe('Clinvar Variants Track', () => {
  const mockClinvarVariants: ClinvarVariant[] = [
    clinvarVariantFactory.build({ gold_stars: 0, major_consequence: "missense_variant" }),
    clinvarVariantFactory.build({ gold_stars: 1, major_consequence: "missense_variant" }),
    clinvarVariantFactory.build({ gold_stars: 2, major_consequence: "missense_variant"}),
    clinvarVariantFactory.build({ gold_stars: 3, major_consequence: "missense_variant"}),
    clinvarVariantFactory.build({ gold_stars: 4, major_consequence: "missense_variant"}),
  ]

  const mockTranscripts: Transcript[] = [
    transcriptFactory.build(),
    transcriptFactory.build(),
    transcriptFactory.build(),
    transcriptFactory.build(),
  ]

  test('renders correctly with default props', () => {
    const childProps = {
      centerPanelWidth: 3,
      isPositionDefined: true,
      leftPanelWidth: 4,
      regions: [],
      rightPanelWidth: 5,
      scalePosition: (i: number) => (i),
    }

    const tree = renderer.create(
      <RegionViewerContext.Provider value={childProps}>
        <ClinvarVariantTrack
          referenceGenome="GRCh38"
          transcripts={mockTranscripts}
          variants={mockClinvarVariants}
        />
      </RegionViewerContext.Provider>
    )
    expect(tree).toMatchSnapshot()
  })
})
