import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { trackPropTypes } from '@broad/region-viewer'

import { RegionsPlot } from './RegionsPlot'

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  margin-bottom: 5px;
`

const LeftPanel = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: ${props => props.width}px;
`

const CenterPanel = styled.div`
  display: flex;
  width: ${props => props.width}px;
`

export const RegionsTrack = ({ leftPanelWidth, positionOffset, title, width, xScale, ...rest }) => (
  <Wrapper>
    <LeftPanel width={leftPanelWidth}>
      {title.split('\n').map(s => (
        <span key={s}>{s}</span>
      ))}
    </LeftPanel>
    <CenterPanel width={width}>
      <RegionsPlot
        {...rest}
        width={width}
        xScale={pos => xScale(positionOffset(pos).offsetPosition)}
      />
    </CenterPanel>
  </Wrapper>
)

RegionsTrack.propTypes = {
  ...trackPropTypes,
  ...RegionsPlot.propTypes,
  title: PropTypes.string,
}

RegionsTrack.defaultProps = {
  title: '',
}
