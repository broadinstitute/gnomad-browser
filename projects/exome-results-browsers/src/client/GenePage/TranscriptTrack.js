import LeftArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-circle-left.svg'
import RightArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-circle-right.svg'
import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { trackPropTypes } from '@broad/region-viewer'

import { RegionsPlot } from '@broad/track-regions'

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  margin-bottom: 5px;
`

const LeftPanel = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  box-sizing: border-box;
  width: ${props => props.width}px;
  padding-right: 10px;

  svg {
    fill: #424242;
  }
`

const CenterPanel = styled.div`
  display: flex;
  width: ${props => props.width}px;
`

const TranscriptTrack = ({ exons, leftPanelWidth, positionOffset, strand, width, xScale }) => {
  const StrandIcon = strand === '-' ? LeftArrow : RightArrow
  return (
    <Wrapper>
      <LeftPanel width={leftPanelWidth}>
        <StrandIcon height={20} width={20} />
      </LeftPanel>
      <CenterPanel width={width}>
        <RegionsPlot
          height={20}
          regions={exons}
          regionAttributes={() => ({ fill: '#424242' })}
          width={width}
          xScale={pos => xScale(positionOffset(pos).offsetPosition)}
        />
      </CenterPanel>
    </Wrapper>
  )
}

TranscriptTrack.propTypes = {
  ...trackPropTypes,
  exons: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
    })
  ).isRequired,
  strand: PropTypes.oneOf(['+', '-']).isRequired,
}

export default TranscriptTrack
