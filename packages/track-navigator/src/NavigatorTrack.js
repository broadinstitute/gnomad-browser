import PropTypes from 'prop-types'
import React from 'react'
import ReactCursorPosition from 'react-cursor-position'
import styled from 'styled-components'

import { Track } from '@broad/region-viewer'

import { Navigator } from './Navigator'

const TitlePanel = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: ${props => props.height}px;
`

export const NavigatorTrack = ({
  height,
  hoveredVariant,
  onNavigatorClick,
  title,
  variants,
  visibleVariantWindow,
}) => (
  <Track
    renderLeftPanel={() => (
      <TitlePanel height={height}>
        {title.split('\n').map(s => (
          <span key={s}>{s}</span>
        ))}
      </TitlePanel>
    )}
  >
    {({ scalePosition, width }) => (
      <ReactCursorPosition className="cursorPosition">
        <Navigator
          height={height}
          hoveredVariant={hoveredVariant}
          onNavigatorClick={onNavigatorClick}
          scalePosition={scalePosition}
          variants={variants}
          visibleVariantWindow={visibleVariantWindow}
          width={width}
        />
      </ReactCursorPosition>
    )}
  </Track>
)

NavigatorTrack.propTypes = {
  height: PropTypes.number,
  hoveredVariant: PropTypes.string,
  onNavigatorClick: PropTypes.func.isRequired,
  title: PropTypes.string,
  variants: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
  visibleVariantWindow: PropTypes.arrayOf(PropTypes.number).isRequired,
}

NavigatorTrack.defaultProps = {
  height: 60,
  hoveredVariant: null,
  title: '',
}
