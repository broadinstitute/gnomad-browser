/* eslint-disable react/prop-types */
import React, { PropTypes, Component } from 'react'
import { Motion, spring } from 'react-motion'
// import FlatButton from 'material-ui/FlatButton'
// import ContentAdd from 'material-ui/svg-icons/content/add'

import R from 'ramda'

import TranscriptFlipOutButton from './transcriptFlipOutButton'

import {
  filterRegions,
} from 'utilities/calculateOffsets'  // eslint-disable-line

import defaultStyles from './styles.css'

const TranscriptAxis = ({
  css,
  title,
  leftPanelWidth,
  fontSize,
  expandTranscriptButton,
}) => {
  return (
    <div style={{ width: leftPanelWidth }} className={css.transcriptLeftAxis}>
      <div style={{ fontSize }} className={css.transcriptName}>
        {expandTranscriptButton || title}
      </div>
    </div>
  )
}
TranscriptAxis.propTypes = {
  title: PropTypes.string,
  leftPanelWidth: PropTypes.number.isRequired,
}

const TranscriptDrawing = ({
  css,
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
        className={css.transcriptTrackBackground}
        x={0}
        y={0}
        width={width}
        height={height}
        stroke={'none'}
      />
      <line
        className={css.transcriptTrackLine}
        x1={0}
        x2={width}
        y1={height / 2}
        y2={height / 2}
        strokeWidth={2}
      />
      {regions.map((region, i) => {
        const start = positionOffset(region.start)
        const stop = positionOffset(region.stop)
        let localThickness
        if (isMaster) {
          localThickness = region.thickness
        } else {
          localThickness = css.flipOutExonThickness
        }
        if (start.offsetPosition !== undefined && stop.offsetPosition !== undefined) {
          return (
            <line
              className={css.rectangle}
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

const Transcript = ({
  css,
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
  let localHeight
  if (motionHeight !== undefined) {
    localHeight = motionHeight
  } else {
    localHeight = height
  }
  let expandTranscriptButton
  if (isMaster) {
    localHeight = 40
    paddingTop = 2
    paddingBottom = 2
    expandTranscriptButton = (
      <TranscriptFlipOutButton
        css={css}
        localHeight={localHeight}
        leftPanelWidth={leftPanelWidth}
        onClick={fanOut}
      />
    )
  }
  return (
    <div
      style={{
        height: localHeight,
        paddingTop,
        paddingBottom,
        opacity,
       }}
       className={css.transcriptContainer}
      >
      <TranscriptAxis
        css={css}
        leftPanelWidth={leftPanelWidth}
        title={title}
        fontSize={fontSize}
        expandTranscriptButton={expandTranscriptButton}
      />
      <div className={css.transcriptData}>
        <TranscriptDrawing
          css={css}
          width={width}
          height={localHeight}
          regions={regions}
          xScale={xScale}
          positionOffset={positionOffset}
          isMaster={isMaster}
        />
      </div>
    </div>
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
  css,
  transcriptsGrouped,
  fanOutButtonOpen,
  initialTranscriptStyles,
  finalTranscriptStyles,
  ...rest
}) => {
  const transcriptGroup = (
    <div className={css.transcriptsGrouped}>
      {Object.keys(transcriptsGrouped).map((transcript, index) => {
        const transcriptExonsFiltered =
          filterRegions(['CDS'], transcriptsGrouped[transcript])
        if (R.isEmpty(transcriptExonsFiltered)) {
          return
        }
        const style = fanOutButtonOpen ?
          finalTranscriptStyles(index) : initialTranscriptStyles()
        return (
          <Motion style={style} key={index}>
            {({
              top,
              paddingTop,
              paddingBottom,
              fontSize,
              opacity,
            }) => {
              return (
                <Transcript
                  css={css}
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
    </div>
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

class TranscriptTrack extends Component {

  static PropTypes = {
    css: PropTypes.object,
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
    const deltaY = (childIndex + 1) * 2
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
    // console.log(this.props.position)
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
      <div
        className={this.props.css.track}
      >
        <Transcript
          isMaster fanOut={this.fanOut}
          regions={this.props.offsetRegions}
          {...this.props}
        />
        {transcriptGroup}
      </div>
    )
  }
}

TranscriptTrack.defaultProps = {
  css: defaultStyles,
}

export default TranscriptTrack
