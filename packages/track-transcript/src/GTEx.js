import { scaleLinear } from 'd3-scale'
import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { QuestionMark } from '@broad/help'
import { ExternalLink, withTooltip } from '@broad/ui'

import { tissueLabels } from './tissueLabels'

const GtexTitleWrapper = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 50px;
  padding-left: 10px;
  width: 100%;
`


const GtexTitleText = styled.span`
  color: #428bca;
  font-size: 13px;
  margin-bottom: 5px;
  text-decoration: none;
`


const GtexTissueSelect = styled.select`
  font-size: 12px;
  max-width: 100%;
`


const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: ${props => props.width}px;
`


const getTissueExpressionValue = (tissueExpressions, tissueOrMetric) => {
  const isAggregate = tissueOrMetric.indexOf('aggregate-') === 0
  if (isAggregate) {
    const metric = tissueOrMetric.slice(10)
    return tissueExpressions.aggregate[metric]
  }
  return tissueExpressions.individual[tissueOrMetric]
}


export function TissueIsoformExpressionPlotHeader({
  currentGene,
  currentTissue,
  maxTissueExpressions,
  onTissueChange,
  width,
}) {
  const selectedTissue = currentTissue || 'aggregate-mean'
  const maxExpressionValue = getTissueExpressionValue(maxTissueExpressions, selectedTissue)

  const allTissues = Object.keys(maxTissueExpressions.individual).sort()

  const padding = 10

  const gtexScale = scaleLinear()
    .domain([0, maxExpressionValue])
    .range([padding, width - padding])
    .nice()

  const plotAxis = (
    <svg height={30} width={width}>
      <line
        x1={padding}
        x2={width - padding}
        y1={20}
        y2={20}
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
              y1={15}
              y2={25}
              stroke={'black'}
              key={`${x}-xtick`}
            />
            <text
              x={xPos}
              y={13}
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

  const options = allTissues.map(tissue => (
    <option key={`${tissue}-option`} value={tissue}>
      {tissueLabels[tissue]} {`(${maxTissueExpressions.individual[tissue]})`}
    </option>
  ))

  return (
    <Wrapper width={width}>
      <GtexTitleWrapper>
        <GtexTitleText>
          <ExternalLink href={`http://www.gtexportal.org/home/gene/${currentGene}`}>
            Isoform expression
          </ExternalLink>
          <QuestionMark topic="gtex" />
        </GtexTitleText>

        <GtexTissueSelect
          onChange={event => onTissueChange(event.target.value)}
          value={selectedTissue}
        >
          <optgroup label="Across all tissues">
            <option key="aggregate-mean" value="aggregate-mean">
              Mean ({maxTissueExpressions.aggregate.mean.toFixed(3)})
            </option>
            <option key="aggregate-median" value="aggregate-median">
              Median ({maxTissueExpressions.aggregate.median.toFixed(3)})
            </option>
          </optgroup>
          <optgroup label="Specific tissue">
            {options}
          </optgroup>
        </GtexTissueSelect>
      </GtexTitleWrapper>
      {plotAxis}
    </Wrapper>
  )
}

TissueIsoformExpressionPlotHeader.propTypes = {
  currentGene: PropTypes.string.isRequired,
  currentTissue: PropTypes.string,
  maxTissueExpressions: PropTypes.object.isRequired,
  onTissueChange: PropTypes.func.isRequired,
  width: PropTypes.number.isRequired,
}

TissueIsoformExpressionPlotHeader.defaultProps = {
  currentTissue: undefined,
}


const WithExpressionTooltip = withTooltip(
  ({ expression, transcriptId }) => (
    <span><strong>{transcriptId}:</strong> {expression}</span>
  )
)


export function TissueIsoformExpressionPlot({
  currentTissue,
  height,
  maxTissueExpressions,
  transcript,
  width,
}) {
  const selectedTissue = currentTissue || 'aggregate-mean'
  const maxExpressionValue = getTissueExpressionValue(maxTissueExpressions, selectedTissue)

  const padding = 10

  const gtexScale = scaleLinear()
    .domain([0, maxExpressionValue])
    .range([padding, width - padding])
    .nice()

  const tpm = getTissueExpressionValue(transcript.gtexTissueExpression, selectedTissue)

  return (
    <Wrapper width={width}>
      <svg height={height} width={width}>
        <line
          x1={padding}
          x2={width - padding}
          y1={height / 2}
          y2={height / 2}
          stroke={'black'}
          strokeDasharray="1.5"
        />
        <WithExpressionTooltip
          expression={tpm}
          transcriptId={transcript.transcript_id}
        >
          <circle
            cx={gtexScale(tpm)}
            cy={height / 2}
            r={5}
            fill={'black'}
          />
        </WithExpressionTooltip>
      </svg>
    </Wrapper>
  )
}

TissueIsoformExpressionPlot.propTypes = {
  currentTissue: PropTypes.string,
  height: PropTypes.number.isRequired,
  maxTissueExpressions: PropTypes.object.isRequired,
  transcript: PropTypes.object.isRequired,
  width: PropTypes.number.isRequired,
}

TissueIsoformExpressionPlot.defaultProps = {
  currentTissue: undefined,
}
