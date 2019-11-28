import React from 'react'
import TranscriptsTrack from '@broad/track-transcripts'

import GeneViewer from './GeneViewer'

const RegionViewerExample = () => (
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

export default RegionViewerExample
