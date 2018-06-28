import { scaleLinear } from 'd3-scale'
import PropTypes from 'prop-types'
import R from 'ramda'
import React from 'react'
import styled from 'styled-components'

import { QuestionMark } from '@broad/help'
import { tissueMappings } from '@broad/utilities/src/constants/gtex'


const GtexTitleWrapper = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 50px;
  padding-left: 10px;
  width: 100%;
`


const GtexTitleText = styled.a`
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


export function TissueIsoformExpressionPlotHeader({
  currentGene,
  currentTissue,
  onTissueChange,
  tissueStats,
  width,
}) {
  const allTissues = Array.from(tissueStats.keys()).sort()
  const maxTissueValue = tissueStats.first()
  const selectedTissue = currentTissue || 'median-across-all'
  const padding = 10

  const gtexScale = scaleLinear()
    .domain([0, maxTissueValue + (maxTissueValue * 0.3)])
    .range([padding, width - padding])

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
      {tissueMappings[tissue]} {`(${tissueStats.get(tissue)})`}
    </option>
  ))

  return (
    <Wrapper width={width}>
      <GtexTitleWrapper>
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
      {plotAxis}
    </Wrapper>
  )
}

TissueIsoformExpressionPlotHeader.propTypes = {
  currentGene: PropTypes.string.isRequired,
  currentTissue: PropTypes.string,
  onTissueChange: PropTypes.func.isRequired,
  tissueStats: PropTypes.object.isRequired,
  width: PropTypes.number.isRequired,
}

TissueIsoformExpressionPlotHeader.defaultProps = {
  currentTissue: undefined,
}


export function TissueIsoformExpressionPlot({
  height,
  width,
  transcript,
  currentTissue,
  tissueStats,
}) {
  const allTissues = Array.from(tissueStats.keys()).sort()
  const maxTissueValue = tissueStats.first()
  const selectedTissue = currentTissue || 'median-across-all'
  const padding = 10

  const gtexScale = scaleLinear()
    .domain([0, maxTissueValue + (maxTissueValue * 0.3)])
    .range([padding, width - padding])

  const { gtex_tissue_tpms_by_transcript } = transcript
  const tpm = selectedTissue === 'median-across-all'
    ? R.median(allTissues.map(tissue => gtex_tissue_tpms_by_transcript[tissue]))
    : gtex_tissue_tpms_by_transcript[selectedTissue]

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
        <circle
          cx={gtexScale(tpm)}
          cy={height / 2}
          r={5}
          fill={'black'}
        />
      </svg>
    </Wrapper>
  )
}

TissueIsoformExpressionPlot.propTypes = {
  height: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  transcript: PropTypes.object.isRequired,
  currentTissue: PropTypes.string,
  tissueStats: PropTypes.object.isRequired,
}

TissueIsoformExpressionPlot.defaultProps = {
  currentTissue: undefined,
}
