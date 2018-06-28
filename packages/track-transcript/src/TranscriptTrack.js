/* eslint-disable react/prop-types */
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Motion, spring } from 'react-motion'
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
  fontSize,
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
      <TranscriptName style={{ fontSize }}>
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
      {regions.map((region, i) => {  // eslint-disable-line
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
              key={`${i}-rectangle2`}
            />
          )
        }
      })}
    </svg>
  )
}


const TranscriptContainer = styled.div`
  display: flex;
  flex-direction: row;
  padding-bottom: 3px;
  padding-top: 3px;
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
  motionHeight,
  paddingTop,
  paddingBottom,
  fontSize,
  opacity,
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
  let localHeight
  if (motionHeight !== undefined) {
    localHeight = motionHeight
  } else {
    localHeight = height
  }
  let expandTranscriptButton
  if (isMaster) {
    localHeight = 80
    paddingTop = 0  // eslint-disable-line
    paddingBottom = 0  // eslint-disable-line
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
    <TranscriptContainer
      style={{
        height: localHeight,
        paddingTop,
        paddingBottom,
        opacity,
      }}
    >
      <TranscriptLeftPanel
        leftPanelWidth={leftPanelWidth}
        title={title}
        fontSize={fontSize}
        onTranscriptNameClick={onTranscriptNameClick}
        currentTranscript={currentTranscript}
        canonicalTranscript={canonicalTranscript}
        expandTranscriptButton={expandTranscriptButton}
      />

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <TranscriptDrawing
          width={width}
          height={localHeight}
          regions={regions}
          xScale={xScale}
          positionOffset={positionOffset}
          isMaster={isMaster}
        />
      </div>
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

  config = {
    stiffness: 1000,
    damping: 50,
  }

  initialTranscriptStyles = () => ({
    top: spring(0, this.config),
    paddingTop: 0,
    paddingBottom: 0,
    fontSize: 0,
    opacity: 1,
  })

  finalTranscriptStyles = () => {
    return {
      top: spring(this.props.height, this.config),
      paddingTop: 2,
      paddingBottom: 2,
      fontSize: 11,
      opacity: 1,
    }
  }

  renderCanonicalTranscript() {
    return (
      <Transcript
        {...this.props}
        fanOut={this.props.transcriptButtonOnClick}
        fanOutButtonOpen={this.props.transcriptFanOut}
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

      const style = this.props.transcriptFanOut
        ? this.finalTranscriptStyles()
        : this.initialTranscriptStyles()

      return (
        <Motion style={style} key={transcriptId}>
          {({
            top,
            paddingTop,
            paddingBottom,
            fontSize,
            opacity,
          }) => {
            return (
              <Transcript
                {...this.props}
                title={transcriptId}
                motionHeight={top}
                paddingTop={paddingTop}
                paddingBottom={paddingBottom}
                fontSize={fontSize}
                opacity={opacity}
                regions={transcriptExonsFiltered}
                fanOutButtonOpen={this.props.transcriptFanOut}
                transcript={transcript}
              />
            )
          }}
        </Motion>
      )
    })
  }

  render() {
    return (
      <TranscriptTrackContainer>
        {this.renderCanonicalTranscript()}
        {this.props.transcriptsGrouped && (
          <TranscriptGroupWrapper>
            {this.renderAlternateTranscripts()}
          </TranscriptGroupWrapper>
        )}
      </TranscriptTrackContainer>
    )
  }
}
