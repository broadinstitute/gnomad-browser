import React from 'react'
import styled from 'styled-components'
import RegionViewer from '@broad/region'
import { groupExonsByTranscript } from '@broad/utilities/src/transcriptTools'
import TranscriptTrack from '../index'

import geneData from '@resources/dmd-gtex-1507854422.json'  // eslint-disable-line

const Wrapper = styled.div`
  padding-left: 50px;
  padding-top: 50px;
  border: 1px solid #000;
`

const {
  transcript,
  transcripts,
} = geneData

const canonicalExons = transcript.exons
const transcriptsGrouped = transcripts.reduce((acc, transcript) => {
  return {
    ...acc,
    [transcript.transcript_id]: transcript,
  }
}, {})
console.log(transcriptsGrouped)

export default () => {
  return (
    <Wrapper>
      <RegionViewer
        width={1000}
        padding={75}
        regions={canonicalExons}
        rightPanelWidth={100}
      >
        <TranscriptTrack
          transcriptsGrouped={transcriptsGrouped}
          height={10}
        />
      </RegionViewer>
    </Wrapper>
  )
}

