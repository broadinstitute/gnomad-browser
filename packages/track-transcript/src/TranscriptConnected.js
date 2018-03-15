import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { TranscriptTrack } from './index'

import {
  currentGene,
  currentTissue,
  currentTranscript,
  canonicalTranscript,
  currentExon,
  transcripts,
  transcriptsGrouped,
  transcriptFanOut,
  tissueStats,
  strand,
  actions as geneActions,
} from '@broad/redux-genes'

const TranscriptConnected = ({
  ownProps,
  transcripts,
  currentTranscript,
  canonicalTranscript,
  transcriptsGrouped,
  setCurrentTranscript,
  currentExon,
  setCurrentExon,
  currentTissue,
  setCurrentTissue,
  tissueStats,
  strand,
  currentGene,
  transcriptFanOut,
  toggleTranscriptFanOut,
}) => {
  return (
    <TranscriptTrack
      transcripts={transcripts}
      currentTranscript={currentTranscript}
      transcriptsGrouped={transcriptsGrouped}
      onTranscriptNameClick={setCurrentTranscript}
      currentExon={currentExon}
      onExonClick={setCurrentExon}
      currentTissue={currentTissue}
      tissueStats={tissueStats}
      onTissueChange={setCurrentTissue}
      currentGene={currentGene}
      canonicalTranscript={canonicalTranscript}
      strand={strand}
      transcriptFanOut={transcriptFanOut}
      transcriptButtonOnClick={toggleTranscriptFanOut}
      {...ownProps}
    />
  )
}
TranscriptConnected.propTypes = {
  ownProps: PropTypes.object.isRequired,
  currentGene: PropTypes.string,
  currentTissue: PropTypes.string,
  currentTranscript: PropTypes.string,
  canonicalTranscript: PropTypes.string,
  currentExon: PropTypes.string,
  strand: PropTypes.string,
  transcripts: PropTypes.array.isRequired,
  transcriptsGrouped: PropTypes.object.isRequired,
  tissueStats: PropTypes.any.isRequired,
  setCurrentTissue: PropTypes.func.isRequired,
  setCurrentTranscript: PropTypes.func.isRequired,
  setCurrentExon: PropTypes.func.isRequired,
}

TranscriptConnected.defaultProps = {
  currentTissue: null,
  currentTranscript: null,
  canonicalTranscript: null,
  currentExon: null,
  strand: null,
}

const mapStateToProps = (state, ownProps) => ({
  ownProps,
  currentGene: currentGene(state),
  currentTissue: currentTissue(state),
  currentTranscript: currentTranscript(state),
  canonicalTranscript: canonicalTranscript(state),
  currentExon: currentExon(state),
  transcripts: transcripts(state),
  transcriptsGrouped: transcriptsGrouped(state),
  tissueStats: tissueStats(state),
  transcriptFanOut: transcriptFanOut(state),
  strand: strand(state),
})

export default connect(mapStateToProps, geneActions)(TranscriptConnected)
