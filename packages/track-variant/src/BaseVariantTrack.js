import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'


const TrackContainer = styled.div`
  display: flex;
  margin-top: 5px;
`


const LeftPanel = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: center;
  width: ${props => props.width}px;
`


const CenterPanel = styled.div`
  width: ${props => props.width}px;
`


export const BaseVariantTrack = ({
  children,
  leftPanelWidth,
  title,
  width,
}) => (
  <TrackContainer>
    <LeftPanel width={leftPanelWidth}>
      {title.split('\n').map(s => (<span key={s}>{s}</span>))}
    </LeftPanel>
    <CenterPanel width={width}>
      {children}
    </CenterPanel>
  </TrackContainer>
)

BaseVariantTrack.propTypes = {
  children: PropTypes.node,
  leftPanelWidth: PropTypes.number.isRequired,
  title: PropTypes.string,
  width: PropTypes.number.isRequired,
}

BaseVariantTrack.defaultProps = {
  children: undefined,
  title: '',
}
