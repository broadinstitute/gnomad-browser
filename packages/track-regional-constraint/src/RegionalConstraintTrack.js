import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'


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
        <p>Regional constraint</p>
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

            return (
              <g key={region.region_name}>
                <rect
                  x={regionStartPos}
                  y={0}
                  width={regionStopPos - regionStartPos}
                  height={height}
                  fill="rgb(255, 88, 63)"
                  strokeWidth={1}
                  stroke="black"
                  opacity={0.2}
                />
              </g>
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
