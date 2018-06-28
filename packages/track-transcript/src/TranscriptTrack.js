/* eslint-disable react/prop-types */
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import R from 'ramda'

import TranscriptFlipOutButton from './transcriptFlipOutButton'

import {
  TissueIsoformExpressionPlotHeader,
  TissueIsoformExpressionPlot
} from './GTEx'


const flipOutExonThickness = 10


const TranscriptLeftAxis = styled.div`
  display: flex;
  width: ${props => props.width}px;
`

const TranscriptName = styled.div`
  color: black;
  display: flex;
  font-size: 11px;
  width: 100%;
`

const TranscriptLink = styled.a`
  background-color: ${({ isSelected }) => isSelected ? 'rgba(10, 121, 191, 0.1);' : 'none;'}
  border-bottom: ${({ isSelected, isCanonical }) => {
    if (isSelected) {
      return '1px solid red'
    }
    if (isCanonical) {
      return '1px solid #000'
    }
    return 'none'
  }};
  cursor: pointer;
  text-decoration: none;
`


const TranscriptLeftPanel = ({
  title,
  leftPanelWidth,
  expandTranscriptButton,
  currentTranscript,
  canonicalTranscript,
  onTranscriptNameClick,
}) => {
  const contents = expandTranscriptButton ||
    <TranscriptLink
      isSelected={currentTranscript === title}
      isCanonical={canonicalTranscript === title}
      onClick={() => {
        onTranscriptNameClick(title)
      }}
    >
      {title}
    </TranscriptLink>
  return (
    <TranscriptLeftAxis width={leftPanelWidth}>
      <TranscriptName>
        {contents}
      </TranscriptName>
    </TranscriptLeftAxis>
  )
}
TranscriptLeftPanel.propTypes = {
  title: PropTypes.string,
  leftPanelWidth: PropTypes.number.isRequired,
}
TranscriptLeftPanel.defaultProps = {
  title: '',
}

const TranscriptDrawing = ({
  width,
  height,
  regions,
  xScale,
  positionOffset,
  isMaster,
}) => {
  return (
    <svg
      width={width}
      height={height}
    >
      <line
        x1={0}
        x2={width}
        y1={height / 2}
        y2={height / 2}
        stroke={'#BDBDBD'}
        strokeWidth={2}
      />
      {regions.map((region) => {
        const start = positionOffset(region.start)
        const stop = positionOffset(region.stop)
        let localThickness
        if (isMaster) {
          localThickness = region.thickness
        } else {
          localThickness = flipOutExonThickness
        }
        if (start.offsetPosition !== undefined && stop.offsetPosition !== undefined) {
          return (
            <line
              x1={xScale(start.offsetPosition)}
              x2={xScale(stop.offsetPosition)}
              y1={height / 2}
              y2={height / 2}
              stroke={start.color}
              strokeWidth={localThickness}
              key={`${region.start}`}
            />
          )
        }
        return null
      })}
    </svg>
  )
}


const TranscriptContainer = styled.div`
  display: flex;
  flex-direction: row;
  padding-bottom: 2px;
  padding-top: 2px;
`


const Transcript = ({
  width,
  height,
  leftPanelWidth,
  regions,
  xScale,
  title,
  positionOffset,
  isMaster,
  fanOut,
  rightPanelWidth,
  fanOutButtonOpen,
  transcript,
  currentTissue,
  tissueStats,
  onTissueChange,
  showRightPanel,
  currentGene,
  onTranscriptNameClick,
  currentTranscript,
  canonicalTranscript,
  strand,
}) => {
  let expandTranscriptButton
  if (isMaster) {
    expandTranscriptButton = (
      <TranscriptFlipOutButton
        fanOutIsOpen={fanOutButtonOpen}
        strand={strand}
        onClick={fanOut}
      />
    )
  }

  const rightPanel = isMaster
    ? (
      <TissueIsoformExpressionPlotHeader
        currentGene={currentGene}
        currentTissue={currentTissue}
        onTissueChange={onTissueChange}
        tissueStats={tissueStats}
        width={rightPanelWidth}
      />
    )
    : (
      <TissueIsoformExpressionPlot
        currentTissue={currentTissue}
        height={flipOutExonThickness}
        tissueStats={tissueStats}
        transcript={transcript}
        width={rightPanelWidth}
      />
    )

  return (
    <TranscriptContainer>
      <TranscriptLeftPanel
        leftPanelWidth={leftPanelWidth}
        title={title}
        onTranscriptNameClick={onTranscriptNameClick}
        currentTranscript={currentTranscript}
        canonicalTranscript={canonicalTranscript}
        expandTranscriptButton={expandTranscriptButton}
      />

      <TranscriptDrawing
        width={width}
        height={height}
        regions={regions}
        xScale={xScale}
        positionOffset={positionOffset}
        isMaster={isMaster}
      />

      {showRightPanel && fanOutButtonOpen && rightPanel}
    </TranscriptContainer>
  )
}
Transcript.propTypes = {
  height: PropTypes.number.isRequired,
  width: PropTypes.number, // eslint-disable-line
  leftPanelWidth: PropTypes.number, // eslint-disable-line
  xScale: PropTypes.func, // eslint-disable-line
  positionOffset: PropTypes.func,  // eslint-disable-line
}


const TranscriptGroupWrapper = styled.div`
  display: flex;
  flex-direction: column;
`


const TranscriptTrackContainer = styled.div`
  display: flex;
  flex-direction: column;
`


export default class TranscriptTrack extends Component {
  static PropTypes = {
    height: PropTypes.number.isRequired,
    width: PropTypes.number, // eslint-disable-line
    leftPanelWidth: PropTypes.number, // eslint-disable-line
    rightPanelWidth: PropTypes.number, // eslint-disable-line
    xScale: PropTypes.func, // eslint-disable-line
    positionOffset: PropTypes.func,  // eslint-disable-line
  }

  renderCanonicalTranscript() {
    return (
      <Transcript
        {...this.props}
        fanOut={this.props.transcriptButtonOnClick}
        fanOutButtonOpen={this.props.transcriptFanOut}
        height={80}
        isMaster
        regions={this.props.offsetRegions}
      />
    )
  }

  renderAlternateTranscripts() {
    const alternateTranscriptIds = Object.keys(this.props.transcriptsGrouped)

    return alternateTranscriptIds.map((transcriptId) => {
      const transcript = this.props.transcriptsGrouped[transcriptId]
      const transcriptExonsFiltered = transcript.exons.filter(exon => exon.feature_type === 'CDS')

      if (R.isEmpty(transcriptExonsFiltered)) {
        return null
      }

      return (
        <Transcript
          {...this.props}
          key={transcriptId}
          title={transcriptId}
          regions={transcriptExonsFiltered}
          fanOutButtonOpen={this.props.transcriptFanOut}
          transcript={transcript}
        />
      )
    })
  }

  render() {
    return (
      <TranscriptTrackContainer>
        {this.renderCanonicalTranscript()}
        {this.props.transcriptsGrouped && (
          <TranscriptGroupWrapper>
            {this.props.transcriptFanOut && this.renderAlternateTranscripts()}
          </TranscriptGroupWrapper>
        )}
      </TranscriptTrackContainer>
    )
  }
}
