import React from 'react'

import GeneViewer from '@gnomad/region-viewer/example/GeneViewer'

import TranscriptsTrack from '../src'

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
