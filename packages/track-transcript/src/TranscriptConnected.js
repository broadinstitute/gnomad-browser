import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

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

import TranscriptTrack from './TranscriptTrack'


const mapStateToProps = state => ({
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

const mapDispatchToProps = dispatch => ({
  onExonClick: bindActionCreators(geneActions.setCurrentExon, dispatch),
  onTissueChange: bindActionCreators(geneActions.setCurrentTissue, dispatch),
  onTranscriptNameClick: bindActionCreators(geneActions.setCurrentTranscript, dispatch),
  transcriptButtonOnClick: bindActionCreators(geneActions.toggleTranscriptFanOut, dispatch),
})

export default connect(mapStateToProps, mapDispatchToProps)(TranscriptTrack)
