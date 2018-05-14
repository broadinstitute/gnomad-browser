/* eslint-disable react/prop-types */
/* eslint-disable no-mixed-operators
 */
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Motion, spring } from 'react-motion'
import { scaleLinear } from 'd3-scale'
import R from 'ramda'

import { tissueMappings } from '@broad/utilities/src/constants/gtex'
import { QuestionMark } from '@broad/help'

import TranscriptFlipOutButton from './transcriptFlipOutButton'

const flipOutExonThickness = 10

const TranscriptLeftPanel = ({
  title,
  leftPanelWidth,
  fontSize,
  expandTranscriptButton,
  currentTranscript,
  canonicalTranscript,
  onTranscriptNameClick,
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

  const TranscriptLink = styled.a`
    text-decoration: none;
    cursor: pointer;
    background-color: ${({ isSelected }) => isSelected ? 'rgba(10, 121, 191, 0.1);' : 'none;'}
    border-bottom: ${({ isSelected, isCanonical }) => {{
      if (isSelected) {
        return'1px solid red;'
        return'1px solid #000;'
      }
      if (isCanonical) {
        return'1px solid #000;'
      }
      return 'none'
      }}}
    ${'' /* border-radius: 3px; */}
  `

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
    <TranscriptLeftAxis style={{ width: leftPanelWidth }}>
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

const TranscriptRightPanelWrapper = styled.div`
  display: flex;
  width: 100%; /* Set by Redux */
  height: 100%;
  ${'' /* border: 1px solid blue; */}

`
const TranscriptName = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%; /* Set by Redux */
  color: black;
  ${'' /* border: 3px solid blue; */}
`

const GtexTitleWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  height: 70%;
  font-size: 14px;
  padding-left: 10px;
`

const GtexPlotWrapper = styled.div`
  ${'' /* margin-bottom: 5px; */}
`

const GtexTitleText = styled.a`
  font-size: 13px;
  font-weight: normal;
  line-height: 8px;
  margin-bottom: 5px;
  margin-top: 0;
  margin-left: 6px;
  flex-shrink: 0;
  text-decoration: none;
  color: #428bca;
`
const GtexTissueSelect = styled.select`
  max-width: 100%;
  ${'' /* height: 100%; */}
  font-size: 12px;
  margin-bottom: 0;
  margin-top: 0;
  flex-shrink: 0;
`

const TranscriptRightPanel = ({
  rightPanelWidth,
  transcript,
  fanOutButtonOpen,
  currentTissue,
  tissueStats,
  onTissueChange,
  isMaster,
  masterHeight,
  currentGene,
}) => {
  const allTissues = Array.from(tissueStats.keys()).sort()
  const maxTissueValue = tissueStats.first()
  const selectedTissue = currentTissue || 'median-across-all'
  const padding = 10

  const gtexScale = scaleLinear()
    .domain([0, maxTissueValue + (maxTissueValue * 0.3)])
    .range([padding, rightPanelWidth - padding])

  const GtexPlot = () => {
    const { gtex_tissue_tpms_by_transcript } = transcript
    const tpm = selectedTissue === 'median-across-all'
      ? R.median(allTissues.map(tissue => gtex_tissue_tpms_by_transcript[tissue]))
      : gtex_tissue_tpms_by_transcript[selectedTissue]

    return (
      <svg height={flipOutExonThickness} width={rightPanelWidth}>
        <line
          x1={padding}
          x2={rightPanelWidth - padding}
          y1={flipOutExonThickness / 2}
          y2={flipOutExonThickness / 2}
          stroke={'black'}
          strokeDasharray="1.5"
        />
        <circle
          cx={gtexScale(tpm)}
          cy={flipOutExonThickness / 2}
          r={5}
          fill={'black'}
          onClick={() => onTissueChange('hello')}
        />
      </svg>
    )
  }

  const GtexPlotAxis = () => {
    const axisHeight = masterHeight / 3
    return (
      <svg height={axisHeight} width={rightPanelWidth}>
        <line
          x1={padding}
          x2={rightPanelWidth - padding}
          y1={axisHeight - axisHeight / 3}
          y2={axisHeight - axisHeight / 3}
          stroke={'black'}
          strokeWidth={1}
        />
        {gtexScale.ticks(5).map((x) => {
          const xPos = gtexScale(x)
          return (
            <g key={`${x}-tick`}>
              <line
                x1={xPos}
                x2={xPos}
                y1={axisHeight - 5 - axisHeight / 3}
                y2={axisHeight + 5 - axisHeight / 3}
                stroke={'black'}
                key={`${x}-xtick`}
              />
              <text
                x={xPos}
                y={axisHeight - 6 - axisHeight / 3}
                textAnchor={'middle'}
                fontSize={8}
              >
                {x}
              </text>
            </g>
          )
        })}
      </svg>
    )
  }
  if (isMaster) {
    const options = allTissues.map(tissue => (
      <option key={`${tissue}-option`} value={tissue}>
        {tissueMappings[tissue]} {`(${tissueStats.get(tissue)})`}
      </option>
    ))
    return (
      <TranscriptRightPanelWrapper style={{ width: rightPanelWidth }}>
        <TranscriptName>
          <GtexTitleWrapper>
            {/* <GtexTitleText>GTEx (mTPM)</GtexTitleText> */}
            {/* <GtexTitleText>GTEx tissue-specific isoform expression (median TPM)</GtexTitleText> */}
            <GtexTitleText
              href={`http://www.gtexportal.org/home/gene/${currentGene}`}
              target="_blank"
              >
              {/* Tissue-specific isoform expression */}
              Isoform expression
              <QuestionMark topic={'gtex'} display={'inline'} />
            </GtexTitleText>
            <GtexTissueSelect
              onChange={event => onTissueChange(event.target.value)}
              value={selectedTissue}
            >
              <option key="median-across-all" value="median-across-all">
                Median across all tissues ({R.median(Array.from(tissueStats.values()))})
              </option>
              <optgroup label="Specific tissue">
                {options}
              </optgroup>
            </GtexTissueSelect>
          </GtexTitleWrapper>
          <GtexPlotWrapper>
            <GtexPlotAxis />
          </GtexPlotWrapper>
        </TranscriptName>
      </TranscriptRightPanelWrapper>
    )
  }

  return (
    <TranscriptRightPanelWrapper style={{ width: rightPanelWidth }}>
      <TranscriptName>
        <GtexPlot />
      </TranscriptName>
    </TranscriptRightPanelWrapper>
  )
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
  maxTissue,
  tissueStats,
  onTissueChange,
  showRightPanel,
  showLeftPanel,
  currentGene,
  onTranscriptNameClick,
  currentTranscript,
  canonicalTranscript,
  strand,
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
  showLeftPanel = true
  return (
    <TranscriptContainer
      style={{
        height: localHeight,
        paddingTop,
        paddingBottom,
        opacity,
      }}
    >
      {showLeftPanel &&
        <TranscriptLeftPanel
          leftPanelWidth={leftPanelWidth}
          title={title}
          fontSize={fontSize}
          onTranscriptNameClick={onTranscriptNameClick}
          currentTranscript={currentTranscript}
          canonicalTranscript={canonicalTranscript}
          expandTranscriptButton={expandTranscriptButton}
        />}
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
      {showRightPanel && fanOutButtonOpen &&
        <TranscriptRightPanel
          rightPanelWidth={rightPanelWidth}
          title={title}
          fontSize={fontSize}
          transcript={transcript}
          currentTissue={currentTissue}
          maxTissue={maxTissue}
          tissueStats={tissueStats}
          onTissueChange={onTissueChange}
          fanOutButtonOpen={fanOutButtonOpen}
          isMaster={isMaster}
          masterHeight={localHeight}
          currentGene={currentGene}
        />}
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
        const transcriptExonsFiltered = transcriptsGrouped[transcript].exons
          .filter(exon => exon.feature_type === 'CDS')
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
                  fanOutButtonOpen={fanOutButtonOpen}
                  transcript={transcriptsGrouped[transcript]}
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
    rightPanelWidth: PropTypes.number, // eslint-disable-line
    xScale: PropTypes.func, // eslint-disable-line
    positionOffset: PropTypes.func,  // eslint-disable-line
  }

  state = {
    fanOutButtonOpen: true,
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
          fanOutButtonOpen={this.props.transcriptFanOut}
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
          fanOut={this.props.transcriptButtonOnClick}
          fanOutButtonOpen={this.props.transcriptFanOut}
          regions={this.props.offsetRegions}
          {...this.props}
        />
        {transcriptGroup}
      </TranscriptTrackContainer>
    )
  }
}

export default TranscriptTrack
