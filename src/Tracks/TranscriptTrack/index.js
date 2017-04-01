/* eslint-disable react/prop-types */
import React, { PropTypes, Component } from 'react'
import { Motion, spring } from 'react-motion'
import FlatButton from 'material-ui/FlatButton'

import R from 'ramda'

import {
  filterRegions,
} from 'utilities/calculateOffsets'  // eslint-disable-line

import css from './styles.css'

const TranscriptAxis = ({ title, leftPanelWidth }) => {
  return (
    <div style={{ width: leftPanelWidth }} className={css.transcriptLeftAxis}>
      <div className={css.transcriptName}>
        {title}
      </div>
    </div>
  )
}

TranscriptAxis.propTypes = {
  title: PropTypes.string.isRequired,
  leftPanelWidth: PropTypes.number.isRequired,
}

const TranscriptDrawing = ({
  width,
  height,
  regions,
  xScale,
  positionOffset,
}) => {
  return (
    <svg
      width={width}
      height={height}
    >
      <rect
        className={css.border}
        x={0}
        y={0}
        width={width}
        height={height}
        fill={'white'}
        stroke={'none'}
      />
      {regions.map((region, i) => {
        const start = positionOffset(region.start)
        const stop = positionOffset(region.stop)
        return (
          <line
            className={css.rectangle}
            x1={xScale(start.offsetPosition)}
            x2={xScale(stop.offsetPosition)}
            y1={height / 2}
            y2={height / 2}
            stroke={start.color}
            strokeWidth={20}
            key={`${i}-rectangle2`}
          />
        )
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
  motionHeight,
}) => {
  let localHeight
  if (motionHeight) {
    localHeight = motionHeight
  } else {
    localHeight = height
  }
  return (
    <div className={css.transcriptContainer}>
      <TranscriptAxis
        leftPanelWidth={leftPanelWidth}
        title={title}
      />
      <div className={css.transcriptData}>
        <TranscriptDrawing
          width={width}
          height={localHeight}
          regions={regions}
          xScale={xScale}
          positionOffset={positionOffset}
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
            {({ top }) => {
              console.log(top)
              console.log(fanOutButtonOpen)
              return <Transcript motionHeight={top} regions={transcriptExonsFiltered} {...rest} />
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
    if (!this.state.fanOutButtonOpen ){
      this.setState({ fanOutButtonOpen: true })
    } else {
      this.setState({ fanOutButtonOpen: false })
    }
  }

  initialTranscriptStyles = () => ({
    top: spring(2, this.config),
  })

  finalTranscriptStyles = (childIndex) => {
    const deltaY = (childIndex + 1) * 5
    return {
      top: spring(deltaY, this.config),
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
      <div className={css.track}>
        <FlatButton label="Show all transcripts" onClick={this.fanOut} />
        <Transcript regions={this.props.offsetRegions} {...this.props} />
        {transcriptGroup}
      </div>
    )
  }
}

export default TranscriptTrack
