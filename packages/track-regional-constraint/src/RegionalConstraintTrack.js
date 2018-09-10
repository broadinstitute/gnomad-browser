import { transparentize } from 'polished'
import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { QuestionMark } from '@broad/help'
import { withTooltip } from '@broad/ui'


const Container = styled.div`
  display: flex;
  flex-direction: row;
  margin-top: 5px;
`


const LeftPanel = styled.div`
  align-items: center;
  display: flex;
  width: ${props => props.width}px;
`


const CenterPanel = styled.div`
  display: flex;
  align-items: center;
  width: ${props => props.width}px;
`


const RegionAttributeList = styled.dl`
  margin: 0;

  div {
    margin-bottom: 0.25em;
  }

  dt {
    display: inline;
    font-weight: bold;
  }

  dd {
    display: inline;
    margin-left: 0.5em;
  }
`

function regionColor(region) {
  let color
  if (region.obs_exp > 0.6) {
    color = '#e2e2e2'
  }
  // http://colorbrewer2.org/#type=sequential&scheme=YlOrRd&n=3
  if (region.obs_exp > 0.4) {
    color = '#ffeda0'
  }
  if (region.obs_exp > 0.2) {
    color = '#feb24c'
  }
  color = '#f03b20'

  return region.chisq_diff_null < 10.8 ? transparentize(0.8, color) : color
}

const renderNumber = number =>
  number === undefined || number === null ? '-' : number.toPrecision(4)

const WithRegionTooltip = withTooltip(({ region }) => (
  <RegionAttributeList>
    <div>
      <dt>O/E missense:</dt>
      <dd>{renderNumber(region.obs_exp)}</dd>
    </div>
    <div>
      <dt>
        &chi;
        <sup>2</sup>:
      </dt>
      <dd>
        {renderNumber(region.chisq_diff_null)}
        {region.chisq_diff_null !== null && region.chisq_diff_null < 10.8 && ' (not significant)'}
      </dd>
    </div>
  </RegionAttributeList>
))

export default function RegionalConstraintTrack({
  height,
  leftPanelWidth,
  positionOffset,
  regionalConstraintData,
  strand,
  width,
  xScale,
}) {
  return (
    <Container>
      <LeftPanel width={leftPanelWidth}>
        <p>Regional missense constraint</p>
        <QuestionMark topic="regional-constraint" display="inline" />
      </LeftPanel>
      <CenterPanel width={width}>
        <svg height={height} width={width}>
          {regionalConstraintData.map((region) => {
            const regionStart = strand === '+'
              ? region.genomic_start
              : region.genomic_end
            const regionStop = strand === '+'
              ? region.genomic_end
              : region.genomic_start

            const regionStartPos = xScale(positionOffset(regionStart).offsetPosition)
            const regionStopPos = xScale(positionOffset(regionStop).offsetPosition)
            const regionWidth = regionStopPos - regionStartPos

            return (
              <WithRegionTooltip
                key={region.region_name}
                region={region}
              >
                <g>
                  <rect
                    x={regionStartPos}
                    y={0}
                    width={regionWidth}
                    height={height}
                    fill={regionColor(region)}
                    stroke="black"
                  />
                  {(regionWidth > 30) && (
                    <text
                      x={(regionStartPos + regionStopPos) / 2}
                      y={height / 2}
                      dy="0.33em"
                      textAnchor="middle"
                    >
                      {region.obs_exp.toFixed(2)}
                    </text>
                  )}
                </g>
              </WithRegionTooltip>
            )
          })}
        </svg>
      </CenterPanel>
    </Container>
  )
}

RegionalConstraintTrack.propTypes = {
  regionalConstraintData: PropTypes.arrayOf(PropTypes.shape({
    genomic_end: PropTypes.number.isRequired,
    genomic_start: PropTypes.number.isRequired,
    region_name: PropTypes.string.isRequired,
  })).isRequired,
  strand: PropTypes.oneOf(['+', '-']).isRequired,
}
