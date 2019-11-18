import React from 'react'

import GeneViewer from '@broad/region-viewer/example/GeneViewer'

import { RegionsTrack } from '../src'

const RegionsTrackExample = () => (
  <GeneViewer geneSymbol="PCSK9" width={1000}>
    {gene => {
      return (
        <React.Fragment>
          {gene.transcripts.map(transcript => (
            <div key={transcript.transcript_id} style={{ marginBottom: '5px' }}>
              <RegionsTrack
                height={10}
                regions={transcript.exons.filter(e => e.feature_type === 'UTR')}
              />
            </div>
          ))}
        </React.Fragment>
      )
    }}
  </GeneViewer>
)

export default RegionsTrackExample
