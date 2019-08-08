import { max, mean, median } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import PropTypes from 'prop-types'
import React, { useState } from 'react'
import styled from 'styled-components'

import { ExternalLink, TooltipAnchor } from '@broad/ui'

import { GTEX_TISSUE_NAMES } from './gtex'
import { TranscriptsTrack } from './TranscriptsTrack'

const GtexTitleWrapper = styled.div`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  height: 50px;
  padding-left: 10px;
`

const GtexTitleText = styled.span`
  margin-bottom: 5px;
  color: #428bca;
  font-size: 13px;
  text-decoration: none;
`

const GtexTissueSelect = styled.select`
  max-width: 100%;
  font-size: 12px;
`

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: ${props => props.width}px;
  height: 100%;
`

const allTissues = Object.keys(GTEX_TISSUE_NAMES)

const TissueExpressionsPropType = PropTypes.shape(
  allTissues.reduce(
    (acc, tissueName) => ({
      ...acc,
      [tissueName]: PropTypes.number,
    }),
    {}
  )
)

const padding = 10

export function TissueIsoformExpressionPlotHeader({
  children,
  maxTissueExpressions,
  onChangeTissue,
  selectedTissue,
  width,
}) {
  const gtexScale = scaleLinear()
    .domain([0, maxTissueExpressions[selectedTissue] || 1])
    .range([padding, width - padding])
    .nice()

  return (
    <Wrapper width={width}>
      <GtexTitleWrapper>
        <GtexTitleText>{children}</GtexTitleText>

        <GtexTissueSelect value={selectedTissue} onChange={e => onChangeTissue(e.target.value)}>
          <optgroup label="Across all tissues">
            <option value="mean">Mean ({maxTissueExpressions.mean.toFixed(3)})</option>
            <option value="median">Median ({maxTissueExpressions.median.toFixed(3)})</option>
          </optgroup>
          <optgroup label="Specific tissue">
            {allTissues.map(tissue => (
              <option key={tissue} value={tissue}>
                {GTEX_TISSUE_NAMES[tissue]} {`(${maxTissueExpressions[tissue]})`}
              </option>
            ))}
          </optgroup>
        </GtexTissueSelect>
      </GtexTitleWrapper>
      <svg height={30} width={width}>
        <line x1={padding} x2={width - padding} y1={20} y2={20} stroke="#000" strokeWidth={1} />
        {gtexScale.ticks(5).map(x => {
          const xPos = gtexScale(x)
          return (
            <g key={`${x}`}>
              <line x1={xPos} x2={xPos} y1={17} y2={23} stroke="#000" />
              <text x={xPos} y={13} textAnchor="middle" fontSize={8}>
                {x}
              </text>
            </g>
          )
        })}
      </svg>
    </Wrapper>
  )
}

TissueIsoformExpressionPlotHeader.propTypes = {
  children: PropTypes.node,
  maxTissueExpressions: TissueExpressionsPropType.isRequired,
  onChangeTissue: PropTypes.func.isRequired,
  selectedTissue: PropTypes.string.isRequired,
  width: PropTypes.number.isRequired,
}

TissueIsoformExpressionPlotHeader.defaultProps = {
  children: <ExternalLink href="http://www.gtexportal.org/">Isoform expression</ExternalLink>,
}

const ExpressionTooltip = ({ expression, transcriptId }) => (
  <span>
    <strong>{transcriptId}:</strong> {expression.toPrecision(4)}
  </span>
)

ExpressionTooltip.propTypes = {
  transcriptId: PropTypes.string.isRequired,
  expression: PropTypes.number.isRequired,
}

export function TissueIsoformExpressionPlot({
  height,
  maxTissueExpressions,
  selectedTissue,
  transcript,
  width,
}) {
  const gtexScale = scaleLinear()
    .domain([0, maxTissueExpressions[selectedTissue] || 1])
    .range([padding, width - padding])
    .nice()

  const expression = transcript.gtex_tissue_expression[selectedTissue]

  return (
    <Wrapper width={width}>
      <svg height={height} width={width}>
        <line
          x1={padding}
          x2={width - padding}
          y1={height / 2}
          y2={height / 2}
          stroke="#000"
          strokeDasharray="1.5"
        />
        <TooltipAnchor
          tooltipComponent={ExpressionTooltip}
          expression={expression}
          transcriptId={transcript.transcript_id}
        >
          <circle cx={gtexScale(expression)} cy={height / 2} r={5} fill="#000" />
        </TooltipAnchor>
      </svg>
    </Wrapper>
  )
}

TissueIsoformExpressionPlot.propTypes = {
  height: PropTypes.number.isRequired,
  maxTissueExpressions: TissueExpressionsPropType.isRequired,
  selectedTissue: PropTypes.string.isRequired,
  transcript: PropTypes.shape({
    transcript_id: PropTypes.string.isRequired,
    gtex_tissue_expression: TissueExpressionsPropType.isRequired,
  }).isRequired,
  width: PropTypes.number.isRequired,
}

export const TranscriptsTrackWithTissueExpression = ({
  expressionLabel,
  transcripts,
  ...otherProps
}) => {
  const [selectedTissue, setSelectedTissue] = useState('mean')

  const transcriptsWithMeanAndMedianExpresion = transcripts.map(transcript => {
    const expressionValues = Object.values(transcript.gtex_tissue_expression)
    return {
      ...transcript,
      gtex_tissue_expression: {
        ...transcript.gtex_tissue_expression,
        mean: mean(expressionValues),
        median: median(expressionValues),
      },
    }
  })

  const maxTissueExpressions = Object.keys(
    transcriptsWithMeanAndMedianExpresion[0].gtex_tissue_expression
  ).reduce(
    (acc, tissue) => ({
      ...acc,
      [tissue]: max(transcriptsWithMeanAndMedianExpresion, t => t.gtex_tissue_expression[tissue]),
    }),
    {}
  )

  return (
    <TranscriptsTrack
      {...otherProps}
      renderActiveTranscriptRightPanel={({ width }) =>
        width > 150 && (
          <TissueIsoformExpressionPlotHeader
            maxTissueExpressions={maxTissueExpressions}
            selectedTissue={selectedTissue}
            width={width}
            onChangeTissue={setSelectedTissue}
          >
            {expressionLabel}
          </TissueIsoformExpressionPlotHeader>
        )
      }
      renderTranscriptRightPanel={({ transcript, width }) =>
        width > 150 && (
          <TissueIsoformExpressionPlot
            height={10}
            maxTissueExpressions={maxTissueExpressions}
            selectedTissue={selectedTissue}
            transcript={transcript}
            width={width}
          />
        )
      }
      transcripts={transcriptsWithMeanAndMedianExpresion}
    />
  )
}

TranscriptsTrackWithTissueExpression.propTypes = {
  expressionLabel: PropTypes.node,
  transcripts: PropTypes.arrayOf(
    PropTypes.shape({
      transcript_id: PropTypes.string.isRequired,
      exons: PropTypes.arrayOf(
        PropTypes.shape({
          feature_type: PropTypes.string.isRequired,
          start: PropTypes.number.isRequired,
          stop: PropTypes.number.isRequired,
        })
      ).isRequired,
      gtex_tissue_expression: TissueExpressionsPropType.isRequired,
    })
  ).isRequired,
}

TranscriptsTrackWithTissueExpression.defaultProps = {
  expressionLabel: undefined,
}
