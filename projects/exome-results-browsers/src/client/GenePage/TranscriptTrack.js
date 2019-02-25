import LeftArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-circle-left.svg'
import RightArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-circle-right.svg'
import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { RegionsTrack } from '@broad/track-regions'

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
  margin-bottom: 1em;
`

const LeftPanel = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  padding-right: 10px;

  svg {
    fill: #424242;
  }
`

const TranscriptTrack = ({ exons, strand }) => {
  const StrandIcon = strand === '-' ? LeftArrow : RightArrow
  return (
    <Wrapper>
      <RegionsTrack
        height={20}
        regions={exons}
        regionAttributes={() => ({ fill: '#424242' })}
        renderLeftPanel={() => (
          <LeftPanel>
            <StrandIcon height={20} width={20} />
          </LeftPanel>
        )}
      />
    </Wrapper>
  )
}

TranscriptTrack.propTypes = {
  exons: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
    })
  ).isRequired,
  strand: PropTypes.oneOf(['+', '-']).isRequired,
}

export default TranscriptTrack
