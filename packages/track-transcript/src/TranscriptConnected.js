import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import {
  currentGene,
  currentTissue,
  currentTranscript,
  canonicalTranscript,
  transcriptsGrouped,
  transcriptFanOut,
  tissueStats,
  strand,
  actions as geneActions,
} from '@broad/redux-genes'

import TranscriptTrack from './TranscriptTrack'


const mapStateToProps = state => ({
  currentGene: currentGene(state),
  currentTissue: currentTissue(state),
  currentTranscript: currentTranscript(state),
  canonicalTranscript: canonicalTranscript(state),
  transcriptsGrouped: transcriptsGrouped(state),
  tissueStats: tissueStats(state),
  transcriptFanOut: transcriptFanOut(state),
  strand: strand(state),
})

const mapDispatchToProps = dispatch => ({
  onTissueChange: bindActionCreators(geneActions.setCurrentTissue, dispatch),
  setCurrentTranscript: bindActionCreators(geneActions.setCurrentTranscript, dispatch),
  transcriptButtonOnClick: bindActionCreators(geneActions.toggleTranscriptFanOut, dispatch),
})

export default connect(mapStateToProps, mapDispatchToProps)(TranscriptTrack)
