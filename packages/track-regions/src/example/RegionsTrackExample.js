import React from 'react'
import { connect, Provider } from 'react-redux'
import { applyMiddleware, combineReducers, createStore } from 'redux'
import { createLogger } from 'redux-logger'
import thunk from 'redux-thunk'

import { createGeneReducer, transcripts } from '@broad/redux-genes'
import GeneViewer from '@broad/region-viewer/src/example/GeneViewer'

import { RegionsTrack } from '..'

const logger = createLogger()

const store = createStore(
  combineReducers({
    genes: createGeneReducer({
      variantDatasets: {},
    }),
  }),
  applyMiddleware(thunk, logger)
)

const TranscriptRegionsTrack = connect(state => ({ geneTranscripts: transcripts(state) }))(
  ({ geneTranscripts, ...rest }) => (
    <div>
      {geneTranscripts.map(transcript => (
        <RegionsTrack
          key={transcript.transcript_id}
          {...rest}
          regions={transcript.exons.filter(e => e.feature_type === 'UTR')}
        />
      ))}
    </div>
  )
)

const RegionsTrackExample = () => (
  <Provider store={store}>
    <GeneViewer geneName="PCSK9" width={1000}>
      <TranscriptRegionsTrack height={10} />
    </GeneViewer>
  </Provider>
)

export default RegionsTrackExample
