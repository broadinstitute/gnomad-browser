import React, { Component } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

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


const TranscriptIdButton = styled.button`
  -webkit-appearance: none;
  background: ${({ isSelected }) => isSelected ? 'rgba(10, 121, 191, 0.1)' : 'none'};
  border-color: ${({ isSelected, isCanonical }) => {
    if (isSelected) {
      return 'red'
    }
    if (isCanonical) {
      return 'black'
    }
    return '#fff0'
  }};
  border-style: solid;
  border-width: 0 0 1px 0;
  cursor: pointer;
  padding: 0;
`


TranscriptLeftPanel.propTypes = {
  children: PropTypes.node,
  width: PropTypes.number.isRequired,
}

TranscriptLeftPanel.defaultProps = {
  children: undefined,
}

const featureStyles = {
  CDS: {
    color: '#424242',
    thickness: '20px',
  },
  start_pad: {
    color: '#5A5E5C',
    thickness: '3px',
  },
  end_pad: {
    color: '#5A5E5C',
    thickness: '3px',
  },
  intron: {
    color: '#5A5E5C',
    thickness: '3px',
  },
  default: {
    color: 'grey',
    thickness: '3px',
  },
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
        const styles = featureStyles[region.feature_type] || featureStyles.default
        if (start.offsetPosition !== undefined && stop.offsetPosition !== undefined) {
          return (
            <line
              x1={xScale(start.offsetPosition)}
              x2={xScale(stop.offsetPosition)}
              y1={height / 2}
              y2={height / 2}
              stroke={styles.color}
              strokeWidth={regionStrokeWidth || styles.thickness}
              key={`${region.start}`}
            />
          )
        }
        return null
      })}
    </svg>
  )
}

TranscriptDrawing.propTypes = {
  height: PropTypes.number.isRequired,
  positionOffset: PropTypes.func.isRequired,
  regions: PropTypes.arrayOf(
    PropTypes.shape({
      feature_type: PropTypes.string,
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
    })
  ).isRequired,
  regionStrokeWidth: PropTypes.number,
  width: PropTypes.number.isRequired,
  xScale: PropTypes.func.isRequired,
}

TranscriptDrawing.defaultProps = {
  regionStrokeWidth: undefined,
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
  maxTissueExpressions,
  showRightPanel,
  currentTranscript,
  canonicalTranscript,
  renderTranscriptId,
}) => {
  return (
    <TranscriptContainer>
      <TranscriptLeftPanel width={leftPanelWidth}>
        {renderTranscriptId(transcript.transcript_id, {
          isCanonical: canonicalTranscript === transcript.transcript_id,
          isSelected: currentTranscript === transcript.transcript_id,
        })}
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
          maxTissueExpressions={maxTissueExpressions}
          transcript={transcript}
          width={rightPanelWidth}
        />
      )}
    </TranscriptContainer>
  )
}

Transcript.propTypes = {
  canonicalTranscript: PropTypes.string.isRequired,
  currentTissue: PropTypes.string,
  currentTranscript: PropTypes.string,
  height: PropTypes.number.isRequired,
  leftPanelWidth: PropTypes.number.isRequired,
  maxTissueExpressions: PropTypes.object.isRequired,
  positionOffset: PropTypes.func.isRequired,
  regions: PropTypes.arrayOf(PropTypes.shape({
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  })).isRequired,
  renderTranscriptId: PropTypes.func.isRequired,
  rightPanelWidth: PropTypes.number.isRequired,
  showRightPanel: PropTypes.bool.isRequired,
  transcript: PropTypes.object.isRequired,
  width: PropTypes.number.isRequired,
  xScale: PropTypes.func.isRequired,
}

Transcript.defaultProps = {
  currentTissue: null,
  currentTranscript: null,
}


const TranscriptTrackContainer = styled.div`
  display: flex;
  flex-direction: column;
`


export default class TranscriptTrack extends Component {
  static propTypes = {
    canonicalTranscript: PropTypes.string.isRequired,
    currentGene: PropTypes.string,
    currentTissue: PropTypes.string,
    currentTranscript: PropTypes.string,
    height: PropTypes.number.isRequired,
    leftPanelWidth: PropTypes.number.isRequired,
    maxTissueExpressions: PropTypes.object.isRequired,
    offsetRegions: PropTypes.arrayOf(PropTypes.object).isRequired,
    onTissueChange: PropTypes.func.isRequired,
    positionOffset: PropTypes.func.isRequired,
    renderTranscriptId: PropTypes.func,
    rightPanelWidth: PropTypes.number.isRequired,
    setCurrentTranscript: PropTypes.func.isRequired,
    showRightPanel: PropTypes.bool,
    strand: PropTypes.string.isRequired,
    transcriptButtonOnClick: PropTypes.func.isRequired,
    transcriptFanOut: PropTypes.bool.isRequired,
    transcripts: PropTypes.arrayOf(PropTypes.object).isRequired,
    width: PropTypes.number.isRequired,
    xScale: PropTypes.func.isRequired,
  }

  static defaultProps = {
    currentGene: null,
    currentTissue: null,
    currentTranscript: null,
    renderTranscriptId: undefined,
    showRightPanel: true,
  }

  renderRegions() {
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
            maxTissueExpressions={this.props.maxTissueExpressions}
            onTissueChange={this.props.onTissueChange}
            width={this.props.rightPanelWidth}
          />
        )}
      </TranscriptContainer>
    )
  }

  renderTranscriptId = (transcriptId, { isCanonical, isSelected }) => {
    return (
      <TranscriptIdButton
        isCanonical={isCanonical}
        isSelected={isSelected}
        onClick={() => this.props.setCurrentTranscript(transcriptId)}
      >
        {transcriptId}
      </TranscriptIdButton>
    )
  }

  renderTranscripts() {
    // Sort transcripts by isCanonical, mean expression, transcript ID
    const sortedTranscripts = this.props.transcripts.sort((t1, t2) => {
      if (t1.transcript_id === this.props.canonicalTranscript) {
        return -1
      }
      if (t2.transcript_id === this.props.canonicalTranscript) {
        return 1
      }

      const t1Mean = t1.gtexTissueExpression.aggregate.mean
      const t2Mean = t2.gtexTissueExpression.aggregate.mean

      if (t1Mean === t2Mean) {
        return t1.transcript_id.localeCompare(t2.transcript_id)
      }

      return t2Mean - t1Mean
    })

    return sortedTranscripts.map((transcript) => {
      const transcriptExonsFiltered = transcript.exons.filter(exon => exon.feature_type === 'CDS')

      if (transcriptExonsFiltered.length === 0) {
        return null
      }

      return (
        <Transcript
          key={transcript.transcript_id}
          canonicalTranscript={this.props.canonicalTranscript}
          currentTissue={this.props.currentTissue}
          currentTranscript={this.props.currentTranscript}
          height={this.props.height}
          leftPanelWidth={this.props.leftPanelWidth}
          maxTissueExpressions={this.props.maxTissueExpressions}
          positionOffset={this.props.positionOffset}
          regions={transcriptExonsFiltered}
          renderTranscriptId={this.props.renderTranscriptId || this.renderTranscriptId}
          rightPanelWidth={this.props.rightPanelWidth}
          showRightPanel={this.props.showRightPanel && this.props.transcriptFanOut}
          transcript={transcript}
          xScale={this.props.xScale}
          width={this.props.width}
        />
      )
    })
  }

  render() {
    return (
      <TranscriptTrackContainer>
        {this.renderRegions()}
        {this.props.transcriptFanOut && this.renderTranscripts()}
      </TranscriptTrackContainer>
    )
  }
}
