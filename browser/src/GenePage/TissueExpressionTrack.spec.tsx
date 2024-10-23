import React from 'react'
import renderer from 'react-test-renderer'
import { describe, expect, test } from '@jest/globals'

import TissueExpressionTrack, { TranscriptWithTissueExpression } from './TissueExpressionTrack'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { RegionViewerContext } from '@gnomad/region-viewer'

import geneFactory from '../__factories__/Gene'

describe('TissueExpressionTrack', () => {
  test('snapshot has no unexpected changes', () => {
    const regionViewerProps = {
      centerPanelWidth: 500,
      isPositionDefined: true,
      leftPanelWidth: 100,
      regions: [
        {
          start: 0,
          stop: 100,
        },
      ],
      rightPanelWidth: 100,
      scalePosition: (i: number) => i,
    }

    const testTranscriptId = 'transcript-1337'
    const gene = geneFactory.build({ canonical_transcript_id: testTranscriptId })

    const testExons = [
      {
        feature_type: 'CDS',
        start: 10,
        stop: 20,
      },
      {
        feature_type: 'CDS',
        start: 20,
        stop: 30,
      },
      {
        feature_type: 'CDS',
        start: 40,
        stop: 60,
      },
    ]

    const tree = renderer.create(
      <RegionViewerContext.Provider value={regionViewerProps}>
        <TissueExpressionTrack
          exons={testExons}
          expressionRegions={gene.pext!.regions}
          flags={gene.pext!.flags}
          transcripts={gene.transcripts as TranscriptWithTissueExpression[]}
          preferredTranscriptId={testTranscriptId}
          preferredTranscriptDescription="test-canonical-transcript"
        />
      </RegionViewerContext.Provider>
    )

    expect(tree).toMatchSnapshot()
  })
})
