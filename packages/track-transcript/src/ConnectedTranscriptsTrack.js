import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import {
  currentGene,
  currentTissue,
  currentTranscript,
  canonicalTranscript,
  maxTissueExpressions,
  transcripts,
  transcriptFanOut,
  strand,
  actions as geneActions,
} from '@broad/redux-genes'

import { TranscriptsTrack } from './TranscriptsTrack'

const mapStateToProps = state => ({
  currentGene: currentGene(state),
  currentTissue: currentTissue(state),
  currentTranscript: currentTranscript(state),
  canonicalTranscript: canonicalTranscript(state),
  maxTissueExpressions: maxTissueExpressions(state),
  transcripts: transcripts(state),
  transcriptFanOut: transcriptFanOut(state),
  strand: strand(state),
})

const mapDispatchToProps = dispatch => ({
  onTissueChange: bindActionCreators(geneActions.setCurrentTissue, dispatch),
  toggleTranscriptFanOut: bindActionCreators(geneActions.toggleTranscriptFanOut, dispatch),
})

export const ConnectedTranscriptsTrack = connect(
  mapStateToProps,
  mapDispatchToProps
)(TranscriptsTrack)
