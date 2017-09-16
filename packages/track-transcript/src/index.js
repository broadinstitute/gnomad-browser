/* eslint-disable react/prop-types */
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Motion, spring } from 'react-motion'
import R from 'ramda'

import TranscriptFlipOutButton from './transcriptFlipOutButton'

import {
  filterRegions,
} from '@broad/utilities/src/coordinates'  // eslint-disable-line

const flipOutExonThickness = '13px'

const TranscriptAxis = ({
  title,
  leftPanelWidth,
  fontSize,
  expandTranscriptButton,
}) => {
  const TranscriptLeftAxis = styled.div`
    display: flex;
    width: 100%; /* Set by Redux */
  `
  const TranscriptName = styled.div`
  display: flex;
  width: 100%; /* Set by Redux */
  color: black;
  `
  return (
    <TranscriptLeftAxis style={{ width: leftPanelWidth }}>
      <TranscriptName style={{ fontSize }}>
        {expandTranscriptButton || title}
      </TranscriptName>
    </TranscriptLeftAxis>
  )
}
TranscriptAxis.propTypes = {
  title: PropTypes.string,
  leftPanelWidth: PropTypes.number.isRequired,
}
TranscriptAxis.defaultProps = {
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
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        stroke={'none'}
        fill={'white'}
      />
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
              key={`${start.offsetPosition}-rectangle2`}
            />
          )
        }
      })}
    </svg>
  )
}

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
}) => {
  const TranscriptContainer = styled.div`
    display: flex;
    flex-direction: row;
    padding-bottom: 3px;
    padding-top: 3px;
  `

  let localHeight
  if (motionHeight !== undefined) {
    localHeight = motionHeight
  } else {
    localHeight = height
  }
  let expandTranscriptButton
  if (isMaster) {
    localHeight = 40
    paddingTop = 2  // eslint-disable-line
    paddingBottom = 2  // eslint-disable-line
    expandTranscriptButton = (
      <TranscriptFlipOutButton
        localHeight={localHeight}
        leftPanelWidth={leftPanelWidth}
        onClick={fanOut}
      />
    )
  }
  return (
    <TranscriptContainer
      style={{
        height: localHeight,
        paddingTop,
        paddingBottom,
        opacity,
      }}
    >
      <TranscriptAxis
        leftPanelWidth={leftPanelWidth}
        title={title}
        fontSize={fontSize}
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

const TranscriptGroup = ({
  transcriptsGrouped,
  fanOutButtonOpen,
  initialTranscriptStyles,
  finalTranscriptStyles,
  ...rest
}) => {
  const TranscriptGroupWrapper = styled.div`
    display: flex;
    flex-direction: column;
  `
  const transcriptGroup = (
    <TranscriptGroupWrapper>
      {Object.keys(transcriptsGrouped).map((transcript, index) => {
        const transcriptExonsFiltered =
          filterRegions(['CDS'], transcriptsGrouped[transcript])
        if (R.isEmpty(transcriptExonsFiltered)) {
          return  // eslint-disable-line
        }
        const style = fanOutButtonOpen ?
          finalTranscriptStyles(index) : initialTranscriptStyles()
        return (  // eslint-disable-line
          <Motion style={style} key={transcript}>
            {({
              top,
              paddingTop,
              paddingBottom,
              fontSize,
              opacity,
            }) => {
              return (
                <Transcript
                  title={transcript}
                  motionHeight={top}
                  paddingTop={paddingTop}
                  paddingBottom={paddingBottom}
                  fontSize={fontSize}
                  opacity={opacity}
                  regions={transcriptExonsFiltered}
                  {...rest}
                />
              )
            }}
          </Motion>
        )
      })}
    </TranscriptGroupWrapper>
  )
  return <div>{transcriptGroup}</div>
}
TranscriptGroup.propTypes = {
  height: PropTypes.number.isRequired,
  width: PropTypes.number, // eslint-disable-line
  leftPanelWidth: PropTypes.number, // eslint-disable-line
  xScale: PropTypes.func, // eslint-disable-line
  positionOffset: PropTypes.func,  // eslint-disable-line
}

const TranscriptTrackContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  /*border: 1px solid orange;*/
`

class TranscriptTrack extends Component {
  static PropTypes = {
    height: PropTypes.number.isRequired,
    width: PropTypes.number, // eslint-disable-line
    leftPanelWidth: PropTypes.number, // eslint-disable-line
    xScale: PropTypes.func, // eslint-disable-line
    positionOffset: PropTypes.func,  // eslint-disable-line
  }

  state = {
    fanOutButtonOpen: false,
  }

  config = {
    stiffness: 1000,
    damping: 50,
  }

  fanOut = () => {
    if (!this.state.fanOutButtonOpen) {
      this.setState({ fanOutButtonOpen: true })
    } else {
      this.setState({ fanOutButtonOpen: false })
    }
  }

  initialTranscriptStyles = () => ({
    top: spring(0, this.config),
    paddingTop: 0,
    paddingBottom: 0,
    fontSize: 0,
    opacity: 1,
  })

  finalTranscriptStyles = (childIndex) => {
    const deltaY = (childIndex + 1) * 2  // eslint-disable-line
    return {
      top: spring(this.props.height, this.config),
      paddingTop: 2,
      paddingBottom: 2,
      fontSize: 11,
      opacity: 1,
    }
  }

  render() {
    let transcriptGroup
    if (this.props.transcriptsGrouped) {
      transcriptGroup = (
        <TranscriptGroup
          transcriptsGrouped={this.props.geneExons}
          fanOutButtonOpen={this.state.fanOutButtonOpen}
          initialTranscriptStyles={this.initialTranscriptStyles}
          finalTranscriptStyles={this.finalTranscriptStyles}
          {...this.props}
        />
      )
    }
    return (
      <TranscriptTrackContainer>
        <Transcript
          isMaster
          fanOut={this.fanOut}
          regions={this.props.offsetRegions}
          {...this.props}
        />
        {transcriptGroup}
      </TranscriptTrackContainer>
    )
  }
}

export default TranscriptTrack
