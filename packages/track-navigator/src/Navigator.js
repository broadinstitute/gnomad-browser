import { scaleLog } from 'd3-scale'
import PropTypes from 'prop-types'
import React from 'react'
import ReactCursorPosition from 'react-cursor-position'
import styled from 'styled-components'

import { getCategoryFromConsequence } from '@broad/utilities/src/constants/categoryDefinitions'
import { getTableIndexByPosition } from '@broad/utilities/src/variant'

import PositionAxis from './PositionAxis'


const ClickArea = ({
  height,
  width,
  positionOffset,
  invertOffset,
  xScale,
  position, // active mouse position from ReactCursorPosition
  isPositionOutside, // from ReactCursorPosition
  currentTableScrollData,
  onNavigatorClick,
  variants,
  hoveredVariant,
}) => {
  if (variants.size === 0) {
    return <div />
  }
  const numberOfVariantsVisibleInTable = 20
  const { scrollHeight, scrollTop } = currentTableScrollData
  const scrollSync = Math.floor((scrollTop / scrollHeight) * variants.size)
  let currentlyVisibleVariants

  if (variants.size < scrollSync + numberOfVariantsVisibleInTable) {
    currentlyVisibleVariants = variants.slice(0, numberOfVariantsVisibleInTable).toJS()
  } else {
    currentlyVisibleVariants = variants.slice(
      scrollSync, scrollSync + numberOfVariantsVisibleInTable
    ).toJS()
  }
  if (currentlyVisibleVariants.length === 0) {
    return <div />
  }

  const variantPositions = currentlyVisibleVariants.map(v => ({
    x: xScale(positionOffset(v.pos).offsetPosition),
    variant_id: v.variant_id,
    color: v.variant_id === hoveredVariant ? 'yellow' : 'red',
    allele_freq: v.allele_freq,
    consequence: v.consequence,
  })).filter(v => v.allele_freq !== 0).filter(v => !isNaN(v.x))

  const afScale =
    scaleLog()
      .domain([
        0.000010,
        0.001,
      ])
      .range([4, 12])

  const exacClassicColors = {
    all: '#757575',
    missense: '#F0C94D',
    lof: '#FF583F',
    synonymous: 'green',
  }

  const variantMarks = variantPositions.map((v, i) => {
    const localColor = exacClassicColors[getCategoryFromConsequence(
      v.consequence
    )]
    return (
      <g key={`variant-${v}-${i}`}>
        {v.variant_id === hoveredVariant && <ellipse
          cx={v.x}
          cy={height / 2}
          ry={afScale(v.allele_freq) + 4}
          rx={10}
          fill={'rgba(0,0,0,0)'}
          strokeWidth={1}
          stroke={'black'}
          strokeDasharray={'3, 3'}
        />}
        <ellipse
          cx={v.x}
          cy={height / 2}
          ry={afScale(v.allele_freq)}
          rx={3}
          fill={localColor}
          strokeWidth={0.5}
          stroke={'black'}
          opacity={0.7}
        />
      </g>
    )
  })

  return (
    <div
      onClick={() => {
        const genomePos = invertOffset(position.x)
        const tableIndex = getTableIndexByPosition(genomePos, variants.toJS())
        onNavigatorClick(tableIndex, genomePos)
      }}
      onTouchStart={() => {
        const genomePos = invertOffset(position.x)
        const tableIndex = getTableIndexByPosition(genomePos, variants.toJS())
        onNavigatorClick(tableIndex, genomePos)
      }}
      style={{ cursor: 'pointer', width: `${width}px` }}
    >
      <svg height={height} width={width}>
        <rect
          className={'navigatorContainerRect'}
          x={0}
          y={0}
          width={width}
          height={height}
          fill={'none'}
        />

        {!isPositionOutside &&
        <rect
          className={'cursorPositionRect'}
          x={position.x - 15}
          y={0}
          width={30}
          height={height}
          strokeDasharray={'5, 5'}
          fill={'none'}
          stroke={'black'}
          strokeWidth={'1px'}
          style={{
            cursor: 'pointer',
          }}
        />}
        {variantMarks}
      </svg>
      <PositionAxis
        height={height}
        invertOffset={invertOffset}
        width={width}
      />
    </div>
  )
}

ClickArea.propTypes = {
  currentTableScrollData: PropTypes.shape({
    scrollHeight: PropTypes.number.isRequired,
    scrollTop: PropTypes.number.isRequired,
  }).isRequired,
  height: PropTypes.number,
  hoveredVariant: PropTypes.string.isRequired,
  invertOffset: PropTypes.func.isRequired,
  isPositionOutside: PropTypes.bool,
  onNavigatorClick: PropTypes.func.isRequired,
  position: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }),
  positionOffset: PropTypes.func.isRequired,
  variants: PropTypes.object.isRequired,
  width: PropTypes.number.isRequired,
  xScale: PropTypes.func.isRequired,
}

ClickArea.defaultProps = {
  height: 60,
  isPositionOutside: true,
  position: undefined,
}


const NavigatorTrackContainer = styled.div`
  display: flex;
`


const LeftPanel = styled.div`
  display: flex;
  flex-direction: column;
  height: 60px;
  justify-content: center;
  width: ${props => props.width}px;
`


const NavigatorTrack = (props) => {
  return (
    <NavigatorTrackContainer>
      <LeftPanel width={props.leftPanelWidth}>
        {props.title}
      </LeftPanel>
      <ReactCursorPosition className={'cursorPosition'}>
        <ClickArea {...props} />
      </ReactCursorPosition>
    </NavigatorTrackContainer>
  )
}

NavigatorTrack.propTypes = {
  currentTableScrollData: PropTypes.shape({
    scrollHeight: PropTypes.number.isRequired,
    scrollTop: PropTypes.number.isRequired,
  }).isRequired,
  hoveredVariant: PropTypes.string.isRequired,
  invertOffset: PropTypes.func.isRequired,
  leftPanelWidth: PropTypes.number.isRequired,
  onNavigatorClick: PropTypes.func.isRequired,
  positionOffset: PropTypes.func.isRequired,
  title: PropTypes.string,
  variants: PropTypes.object.isRequired,
  width: PropTypes.number.isRequired,
  xScale: PropTypes.func.isRequired,
}

NavigatorTrack.defaultProps = {
  title: '',
}

export default NavigatorTrack
