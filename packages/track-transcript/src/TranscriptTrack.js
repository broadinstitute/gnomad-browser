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


const TranscriptLeftPanel = styled.div`
  color: black;
  display: flex;
  font-size: 11px;
  width: ${props => props.width}px;
`


const TranscriptLink = styled.a`
  background-color: ${({ isSelected }) => isSelected ? 'rgba(10, 121, 191, 0.1)' : 'none'};
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


TranscriptLeftPanel.propTypes = {
  children: PropTypes.node,
  width: PropTypes.number.isRequired,
}

TranscriptLeftPanel.defaultProps = {
  children: undefined,
}

const TranscriptDrawing = ({
  width,
  height,
  regions,
  xScale,
  positionOffset,
  regionStrokeWidth,
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
        if (start.offsetPosition !== undefined && stop.offsetPosition !== undefined) {
          return (
            <line
              x1={xScale(start.offsetPosition)}
              x2={xScale(stop.offsetPosition)}
              y1={height / 2}
              y2={height / 2}
              stroke={start.color}
              strokeWidth={regionStrokeWidth || region.thickness}
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
  positionOffset,
  rightPanelWidth,
  transcript,
  currentTissue,
  tissueStats,
  showRightPanel,
  onTranscriptNameClick,
  currentTranscript,
  canonicalTranscript,
}) => {
  return (
    <TranscriptContainer>
      <TranscriptLeftPanel width={leftPanelWidth}>
        <TranscriptLink
          isCanonical={canonicalTranscript === transcript.transcript_id}
          isSelected={currentTranscript === transcript.transcript_id}
          onClick={() => {
            onTranscriptNameClick(transcript.transcript_id)
          }}
        >
          {transcript.transcript_id}
        </TranscriptLink>
      </TranscriptLeftPanel>

      <TranscriptDrawing
        width={width}
        height={height}
        regions={regions}
        xScale={xScale}
        positionOffset={positionOffset}
        regionStrokeWidth={flipOutExonThickness}
      />

      {showRightPanel && (
        <TissueIsoformExpressionPlot
          currentTissue={currentTissue}
          height={flipOutExonThickness}
          tissueStats={tissueStats}
          transcript={transcript}
          width={rightPanelWidth}
        />
      )}
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
      <TranscriptContainer>
        <TranscriptLeftPanel width={this.props.leftPanelWidth}>
          <TranscriptFlipOutButton
            fanOutIsOpen={this.props.transcriptFanOut}
            strand={this.props.strand}
            onClick={this.props.transcriptButtonOnClick}
          />
        </TranscriptLeftPanel>

        <TranscriptDrawing
          height={80}
          positionOffset={this.props.positionOffset}
          regions={this.props.offsetRegions}
          width={this.props.width}
          xScale={this.props.xScale}
        />

        {this.props.showRightPanel && this.props.transcriptFanOut && (
          <TissueIsoformExpressionPlotHeader
            currentGene={this.props.currentGene}
            currentTissue={this.props.currentTissue}
            onTissueChange={this.props.onTissueChange}
            tissueStats={this.props.tissueStats}
            width={this.props.rightPanelWidth}
          />
        )}
      </TranscriptContainer>
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
          regions={transcriptExonsFiltered}
          showRightPanel={this.props.showRightPanel && this.props.transcriptFanOut}
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
