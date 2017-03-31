/* eslint-disable react/prop-types */
import React, { PropTypes } from 'react'
import R from 'ramda'

import {
  filterRegions,
} from 'utilities/calculateOffsets'  // eslint-disable-line

import {
  groupExonsByTranscript,
} from 'utilities/transcriptTools'  // eslint-disable-line

import css from './styles.css'

const Axis = ({ height, title, width }) => {
  return <div className={css.yLabel}>{title}</div>
}

Axis.propTypes = {
  height: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  width: PropTypes.number.isRequired,
}

const Transcripts = ({
  width,
  height,
  offsetRegions,
  xScale,
}) => (
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
    {offsetRegions.map((region, i) => (
      <line
        className={css.rectangle}
        x1={xScale(region.start - region.offset)}
        x2={xScale(region.stop - region.offset)}
        y1={height / 2}
        y2={height / 2}
        stroke={region.color}
        strokeWidth={region.thickness}
        key={`${i}-rectangle`}
      />
      )
    )}
  </svg>
)

const TranscriptMulti = ({
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
    }
      )}
    </svg>
  )
}

const TranscriptTrack = ({
  width,
  height,
  leftPanelWidth,
  offsetRegions,
  xScale,
  title,
  geneExons,
  positionOffset,
}) => {
  let allTranscripts
  if (geneExons) {
    const transcriptsGrouped = groupExonsByTranscript(geneExons)
    allTranscripts =  (
      <div className={css.track}>
        <div className={css.data}>
          {Object.keys(transcriptsGrouped).map(transcript => {
            const transcriptExonsFiltered =
              filterRegions(['CDS'], transcriptsGrouped[transcript])
            if (R.isEmpty(transcriptExonsFiltered)) {
              return
            }
            return (
              <TranscriptMulti
                key={`transcript-${transcript}`}
                width={width}
                height={height}
                regions={transcriptExonsFiltered}
                xScale={xScale}
                positionOffset={positionOffset}
              />
            )
          })}
        </div>
      </div>
    )
  }
  return (
    <div className={css.track}>
      <div className={css.yAxis}>
        <Axis
          height={height}
          width={leftPanelWidth}
          title={title}
        />
      </div>
      <div className={css.data}>
        <Transcripts
          width={width}
          height={height}
          offsetRegions={offsetRegions}
          xScale={xScale}
        />
      {allTranscripts}
      </div>
    </div>
  )
}
TranscriptTrack.propTypes = {
  height: PropTypes.number.isRequired,
  width: PropTypes.number, // eslint-disable-line
  leftPanelWidth: PropTypes.number, // eslint-disable-line
  xScale: PropTypes.func, // eslint-disable-line
  positionOffset: PropTypes.func,  // eslint-disable-line
}

export default TranscriptTrack
