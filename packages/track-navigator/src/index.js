/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
/* eslint-disable no-case-declarations */
/* eslint-disable react/prop-types */

import React, { PropTypes } from 'react'
import styled from 'styled-components'
import ReactCursorPosition from 'react-cursor-position'
import R from 'ramda'
import { getTableIndexByPosition } from '@broad/utilities/src/variant'
import { range } from 'd3-array'
import { line } from 'd3-shape'
import { scaleLog } from 'd3-scale'

const NavigatorAxisName = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-size: 12px;
  margin-left: 30;
  width: ${props => props.leftPanelWidth}px;
`

//
// const AreaClick = styled.div`
//   border: 1px solid yellow;
// `
//
// const NavigatorContainerRect = styled.div`
//   fill: #DAEDE2;
//   stroke: red;
// `
//
// const CursorPositionRect = styled.div`
//   fill: #EA2E49;
//   stroke: black;
//   stroke-width: 1px;
//   cursor: pointer;
// `
//
// const TablePositionRect = styled.div`
//   fill: green;
//   stroke: black;
//   stroke-width: 1px;
// `
//


const NavigatorAxis = ({ title, height, leftPanelWidth }) => {
  console.log(leftPanelWidth)
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
  // scrollSync, // position in from table
  currentTableScrollData,
  onNavigatorClick,
  variantPlotData, // TODO
  variants,
  currentVariant,
  variantSortKey, // TODO
  noVariants,
}) => {
  console.log(currentTableScrollData)
  const numberOfVariantsVisibleInTable = 26
  const { scrollHeight, scrollTop } = currentTableScrollData
  const scrollSync = Math.floor((scrollTop / scrollHeight) * variants.size)
  let currentlyVisibleVariants

  if (variants.size < scrollSync + numberOfVariantsVisibleInTable) {
    currentlyVisibleVariants = variants.slice(0, numberOfVariantsVisibleInTable).toJS()
    // .filter(v => !isNaN(xScale(positionOffset(v.pos).offsetPosition)))
  } else {
    currentlyVisibleVariants = variants.slice(
      scrollSync, scrollSync + numberOfVariantsVisibleInTable
    ).toJS()
    // .filter(v => !isNaN(xScale(positionOffset(v.pos).offsetPosition)))
  }
  // console.log(currentlyVisibleVariants)
  const tablePositionStart = R.head(currentlyVisibleVariants).pos
  const tablePositionStop = R.last(currentlyVisibleVariants).pos

  const tableRectPadding = 10
  const tableRectStart = xScale(
    positionOffset(tablePositionStart).offsetPosition
  ) - tableRectPadding
  const tableRectStop = xScale(positionOffset(tablePositionStop).offsetPosition)
  const tableRectWidth = tableRectStop - (tableRectStart + tableRectPadding) // TODO

  const variantPositions = currentlyVisibleVariants.map(v => ({
    x: xScale(positionOffset(v.pos).offsetPosition),
    variant_id: v.variant_id,
    color: v.variant_id === currentVariant ? 'yellow' : 'red',
    allele_freq: v.allele_freq,
  })).filter(v => v.allele_freq !== 0).filter(v => !isNaN(v.x))

  const afScale =
    scaleLog()
      .domain([
        0.000000660,
        0.0001,
      ])
      .range([3, 6])

  const variantMarks = variantPositions.map((v, i) => (
    <g key={`variant-${v}-${i}`}>
      {v.variant_id === currentVariant && <circle
        cx={v.x}
        cy={height / 2.5}
        r={10}
        fill={'rgba(0,0,0,0)'}
        strokeWidth={1}
        stroke={'black'}
        strokeDasharray={'3, 3'}
      />}
      <circle
        cx={v.x}
        cy={height / 2.5}
        r={afScale(v.allele_freq)}
        fill={v.color}
        strokeWidth={1}
        stroke={'black'}
      />
    </g>
  ))


  let allVariantMarks
  if (variants.size < 300) {
    const allVariantPositions = variants.map((v) => {
      return ({
        x: xScale(positionOffset(v.pos).offsetPosition),
        variant_id: v.variant_id,
        allele_freq: v.allele_freq,
      })
    }).filter(v => !isNaN(v.x))
    allVariantMarks = allVariantPositions.map((v, i) => (
      <g key={`variant-${v}-${i}`}>
        <circle
          cx={v.x}
          cy={height / 2.5}
          r={afScale(v.allele_freq)}
          fill={'grey'}
        />
      </g>
    ))
  }

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
      onClick={_ => {
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
    {/*!noVariants && variantSortKey === 'pos' &&
      <rect
        className={'tablePositionRect'}
        x={tableRectStart}
        y={0 + navigatorBoxTopPadding}
        width={tableRectWidth}
        height={height - navigatorBoxBottomPadding}
        strokeDasharray={'5, 5'}
      />*/}

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
      {!noVariants && variants.size < 300 && allVariantMarks}
      {!noVariants && variantMarks}
      <PositionMarks />
    </svg>
  )
}

const NavigatorTrackContainer = styled.div`
  display: flex;
  align-items: center;
  ${'' /* border: 1px solid blue; */}
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
  height: PropTypes.number.isRequired,
  width: PropTypes.number,  // eslint-disable-line
}
NavigatorTrack.defaultProps = {}

export default NavigatorTrack
