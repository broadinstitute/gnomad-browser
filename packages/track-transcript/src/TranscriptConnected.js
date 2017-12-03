import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import { TranscriptTrack } from './index'

import {
  currentGene,
  currentTissue,
  currentTranscript,
  currentExon,
  transcripts,
  transcriptsGrouped,
  tissueStats,
  actions as geneActions,
} from '@broad/redux-genes'

const TranscriptConnected = ({
  ownProps,
  transcripts,
  currentTranscript,
  transcriptsGrouped,
  setCurrentTranscript,
  currentExon,
  setCurrentExon,
  currentTissue,
  setCurrentTissue,
  tissueStats,
  currentGene,
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
      {...ownProps}
    />
  )
}
TranscriptConnected.propTypes = {
  ownProps: PropTypes.object.isRequired,
  currentGene: PropTypes.string,
  currentTissue: PropTypes.string,
  currentTranscript: PropTypes.string,
  currentExon: PropTypes.string,
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
  currentExon: null,
}

const mapStateToProps = (state, ownProps) => ({
  ownProps,
  currentGene: currentGene(state),
  currentTissue: currentTissue(state),
  currentTranscript: currentTranscript(state),
  currentExon: currentExon(state),
  transcripts: transcripts(state),
  transcriptsGrouped: transcriptsGrouped(state),
  tissueStats: tissueStats(state),
})

export default connect(mapStateToProps, geneActions)(TranscriptConnected)