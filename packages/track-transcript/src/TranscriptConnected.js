import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import {
  currentTissue,
  currentTranscript,
  currentExon,
  transcripts,
  transcriptsGrouped,
  tissueStats,
  geneData,
  transcriptFanOut,
  actions as geneActions,
} from '@broad/gene-page/src/resources/genes'

import { currentGene } from '@broad/gene-page/src/resources/active'

import TranscriptTrack from './index'
import { fetchData } from './fetch'


class TranscriptConnected extends PureComponent {
  static propTypes = {
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
    geneData: PropTypes.object.isRequired,
    fetchPageDataByGene: PropTypes.func.isRequired,
    transcriptFanOut: PropTypes.bool.isRequired,
    toggleTranscriptFanOut: PropTypes.func.isRequired,
  }

  static defaultProps = {
    currentTissue: null,
    currentTranscript: null,
    currentExon: null,
    currentGene: null,
  }

  componentDidMount() {
    const { currentGene, fetchPageDataByGene } = this.props
    console.log('fetching transcript data')
    fetchPageDataByGene(currentGene, fetchData)
  }

  render() {
    const {
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
      geneData,
      transcriptFanOut,
      toggleTranscriptFanOut,
    } = this.props
    console.log(geneData)
    if (!transcripts) {
      <TranscriptTrack showLeftPanel {...ownProps} />
    }
    return (
      <TranscriptTrack
        transcripts={transcripts}
        currentTranscript={currentTranscript}
        transcriptFanOut={transcriptFanOut}
        transcriptButtonOnClick={toggleTranscriptFanOut}
        transcriptsGrouped={transcriptsGrouped}
        onTranscriptNameClick={setCurrentTranscript}
        currentExon={currentExon}
        onExonClick={setCurrentExon}
        currentTissue={currentTissue}
        tissueStats={tissueStats}
        onTissueChange={setCurrentTissue}
        currentGene={currentGene}
        strand={geneData.get('strand')}
        showLeftPanel
        showRightPanel
        {...ownProps}
      />
    )
  }
}

const mapStateToProps = (state, ownProps) => ({
  ownProps,
  currentGene: currentGene(state),
  currentTissue: currentTissue(state),
  currentTranscript: currentTranscript(state),
  currentExon: currentExon(state),
  transcripts: transcripts(state),
  transcriptFanOut: transcriptFanOut(state),
  transcriptsGrouped: transcriptsGrouped(state),
  tissueStats: tissueStats(state),
  geneData: geneData(state),
})

export default connect(mapStateToProps, geneActions)(TranscriptConnected)
