import React from 'react'

import GeneViewer from '@broad/region-viewer/src/example/GeneViewer'

import TranscriptsTrack from '..'

const TranscriptsTrackExample = () => (
  <GeneViewer geneSymbol="PCSK9" width={1000}>
    {gene => {
      return (
        <TranscriptsTrack
          activeTranscript={{
            exons: gene.exons,
            strand: gene.strand,
          }}
          canonicalTranscript={gene.canonical_transcript_id}
          transcripts={gene.transcripts}
          showNonCodingTranscripts={false}
          showUTRs={false}
        />
      )
    }}
  </GeneViewer>
)

export default TranscriptsTrackExample
