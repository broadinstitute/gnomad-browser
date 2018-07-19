import { scaleLog } from 'd3-scale'
import PropTypes from 'prop-types'
import React from 'react'
import ReactCursorPosition from 'react-cursor-position'
import styled from 'styled-components'

import { getCategoryFromConsequence } from '@broad/utilities/src/constants/categoryDefinitions'
import { getTableIndexByPosition } from '@broad/utilities/src/variant'

const NavigatorAxisName = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-size: 12px;
  margin-left: 30;
  width: ${props => props.leftPanelWidth}px;
`

const NavigatorAxis = ({ title, height, leftPanelWidth }) => {
  return (
    <NavigatorAxisName leftPanelWidth={leftPanelWidth} height={height}>
      {title}
    </NavigatorAxisName>
  )
}
NavigatorAxis.propTypes = {
  leftPanelWidth: PropTypes.number.isRequired,
}

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
          cy={height / 2.5}
          ry={afScale(v.allele_freq) + 4}
          rx={10}
          fill={'rgba(0,0,0,0)'}
          strokeWidth={1}
          stroke={'black'}
          strokeDasharray={'3, 3'}
        />}
        <ellipse
          cx={v.x}
          cy={height / 2.5}
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

  const PositionMarks = () => {
    const tickHeight = 3
    const numberOfTicks = 10
    const textRotationDegrees = 0
    const textXOffsetFromTick = 0
    const textYOffsetFromTick = 7
    const tickPositions = range(0, width, width / numberOfTicks)
    const tickGenomePositions = tickPositions.map(t => ({ x: t, label: invertOffset(t) }))

    const tickDrawing = (x, genomePositionLabel) => (
      <g key={`tick-${x}-axis`}>
        <line
          className={'xTickLine'}
          x1={x}
          x2={x}
          y1={height - 2}
          y2={height - 2 - tickHeight}
          stroke={'black'}
          strokeWidth={1}
        />
        <text
          style={{ textAnchor: 'center', fontSize: '10px' }}
          x={x + textXOffsetFromTick}
          y={height - textYOffsetFromTick}
          transform={`rotate(${360 - textRotationDegrees} ${x} ${height})`}
        >
          {genomePositionLabel}
        </text>
      </g>
    )

    const axisTicksDrawing = R.tail(tickGenomePositions.map(
      ({ x, label }) => tickDrawing(x, label))
    )

    return (
      <g>
        <line
          className={'xAxisLine'}
          x1={0 + 2}
          x2={width - 2}
          y1={height - 1}
          y2={height - 1}
          stroke={'black'}
          strokeWidth={1}
        />
        <line
          className={'yAxisLine'}
          x1={1}
          x2={1}
          y1={height - 7}
          y2={height}
          stroke={'black'}
          strokeWidth={1}
        />
        <line
          className={'yAxisLine'}
          x1={width - 1}
          x2={width - 1}
          y1={height - 7}
          y2={height}
          stroke={'black'}
          strokeWidth={1}
        />
        {axisTicksDrawing}
      </g>
    )
  }

  const navigatorBoxBottomPadding = 20
  const navigatorBoxTopPadding = 4

  return (
    <svg
      className={'areaClick'}
      width={width}
      height={height}
      onClick={(_) => {
        const genomePos = invertOffset(position.x)
        const tableIndex = getTableIndexByPosition(genomePos, variants.toJS())
        onNavigatorClick(tableIndex, genomePos)
      }}
      onTouchStart={(_) => {
        const genomePos = invertOffset(position.x)
        const tableIndex = getTableIndexByPosition(genomePos, variants.toJS())
        onNavigatorClick(tableIndex, genomePos)
      }}
      style={{
        cursor: 'pointer',
      }}

    >
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
        y={0 + navigatorBoxTopPadding}
        width={30}
        height={height - navigatorBoxBottomPadding}
        strokeDasharray={'5, 5'}
        fill={'none'}
        stroke={'black'}
        strokeWidth={'1px'}
        style={{
          cursor: 'pointer',
        }}
      />}
      {variantMarks}
      <PositionMarks />
    </svg>
  )
}

const NavigatorTrackContainer = styled.div`
  display: flex;
  align-items: center;
`

const NavigatorTrack = (props) => {
  return (
    <NavigatorTrackContainer>
      <NavigatorAxis
        title={props.title}
        height={props.height}
        leftPanelWidth={props.leftPanelWidth}
      />
      <ReactCursorPosition className={'cursorPosition'}>
        <ClickArea {...props} />
      </ReactCursorPosition>
    </NavigatorTrackContainer>
  )
}
NavigatorTrack.propTypes = {
  height: PropTypes.number,
  width: PropTypes.number,
}
NavigatorTrack.defaultProps = {
  height: 60,
}

export default NavigatorTrack
