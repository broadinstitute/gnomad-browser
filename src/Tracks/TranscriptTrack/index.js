/* eslint-disable react/prop-types */
import React, { PropTypes, Component } from 'react'
import R from 'ramda'

import {
  filterRegions,
} from 'utilities/calculateOffsets'  // eslint-disable-line

import {
  groupExonsByTranscript,
} from 'utilities/transcriptTools'  // eslint-disable-line

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
}) => {
  return (
    <div className={css.transcriptContainer}>
      <TranscriptAxis
        leftPanelWidth={leftPanelWidth}
        title={title}
      />
      <div className={css.transcriptData}>
        <TranscriptDrawing
          width={width}
          height={height}
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
  geneExons,
  ...rest
}) => {
  const transcriptsGrouped = groupExonsByTranscript(geneExons)
  const transcriptGroup = (
    <div className={css.transcriptsGrouped}>
      {Object.keys(transcriptsGrouped).map((transcript) => {
        const transcriptExonsFiltered =
          filterRegions(['CDS'], transcriptsGrouped[transcript])
        if (R.isEmpty(transcriptExonsFiltered)) {
          return
        }
        return <Transcript regions={transcriptExonsFiltered} {...rest} />
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

  render() {
    let transcriptGroup
    if (this.props.geneExons) {
      transcriptGroup = <TranscriptGroup geneExons={this.props.geneExons} {...this.props} />
    }
    return (
      <div className={css.track}>
        <Transcript regions={this.props.offsetRegions} {...this.props} />
        {transcriptGroup}
      </div>
    )
  }
}

export default TranscriptTrack
