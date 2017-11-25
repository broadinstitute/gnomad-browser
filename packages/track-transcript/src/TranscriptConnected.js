/* eslint-disable react/prop-types */
import React, { PureComponent } from 'react'
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

import { TranscriptTrack } from './index'
import { fetchData } from './fetch'


class TranscriptConnected extends PureComponent {
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
    if (!transcripts) {
      return (
        <TranscriptTrack
          strand={geneData.get('strand')}
          showLeftPanel
          {...ownProps}
        />
      )
    }
    return (
      <TranscriptTrack
        transcripts={transcripts}
        currentTranscript={currentTranscript}
        transcriptFanOut={transcriptFanOut || false}
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
