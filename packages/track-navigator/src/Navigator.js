import { scaleLog } from 'd3-scale'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import ReactCursorPosition from 'react-cursor-position'
import styled from 'styled-components'

import { getCategoryFromConsequence } from '@broad/utilities/src/constants/categoryDefinitions'
import { getTableIndexByPosition } from '@broad/utilities/src/variant'

import PositionAxis from './PositionAxis'


const afScale = scaleLog()
  .domain([0.000010, 0.001])
  .range([4, 12])


const exacClassicColors = {
  all: '#757575',
  missense: '#F0C94D',
  lof: '#FF583F',
  synonymous: 'green',
}


class Navigator extends Component {
  static propTypes = {
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
    visibleVariantWindow: PropTypes.arrayOf(PropTypes.number).isRequired,
    width: PropTypes.number.isRequired,
    xScale: PropTypes.func.isRequired,
  }

  static defaultProps = {
    height: 60,
    isPositionOutside: true,
    position: undefined,
  }

  onClick = () => {
    const {
      invertOffset,
      onNavigatorClick,
      position,
      variants,
    } = this.props

    const genomePos = invertOffset(position.x)
    const tableIndex = getTableIndexByPosition(genomePos, variants.toJS())
    onNavigatorClick(tableIndex, genomePos)
  }

  renderCursor() {
    const {
      height,
      isPositionOutside,
      position,
    } = this.props

    if (isPositionOutside) {
      return null
    }

    return (
      <rect
        x={position.x - 15}
        y={0}
        width={30}
        height={height}
        fill="none"
        stroke="black"
        strokeDasharray="5, 5"
        strokeWidth={1}
        style={{ cursor: 'pointer' }}
      />
    )
  }

  renderHoveredVariant(visibleVariants) {
    const {
      height,
      hoveredVariant,
      positionOffset,
      xScale,
    } = this.props

    const variant = visibleVariants.find(v => v.variant_id === hoveredVariant)
    if (!variant) {
      return null
    }

    const ry = (variant.allele_freq === 0)
      ? 4
      : afScale(variant.allele_freq) + 4

    const x = xScale(positionOffset(variant.pos).offsetPosition)

    return (
      <ellipse
        cx={x}
        cy={height / 2}
        rx={10}
        ry={ry}
        fill="none"
        stroke="black"
        strokeDasharray="3, 3"
        strokeWidth={1}
      />
    )
  }

  renderVisibleVariants(visibleVariants) {
    const {
      height,
      positionOffset,
      xScale,
    } = this.props

    return visibleVariants.map((variant) => {
      let fill
      let rx
      let ry
      if (variant.allele_freq === 0) {
        fill = 'white'
        rx = 1
        ry = 1
      } else {
        fill = exacClassicColors[getCategoryFromConsequence(variant.consequence)]
        rx = 3
        ry = afScale(variant.allele_freq)
      }

      const x = xScale(positionOffset(variant.pos).offsetPosition)

      return (
        <ellipse
          key={variant.variant_id}
          cx={x}
          cy={height / 2}
          rx={rx}
          ry={ry}
          fill={fill}
          opacity={0.7}
          stroke="black"
          strokeWidth={0.5}
        />
      )
    })
  }

  render() {
    const {
      height,
      invertOffset,
      variants,
      visibleVariantWindow,
      width,
    } = this.props

    if (variants.size === 0) {
      return <div />
    }

    const visibleVariants = variants
      .slice(visibleVariantWindow[0], visibleVariantWindow[1])
      .toJS()

    if (visibleVariants.length === 0) {
      return <div />
    }

    return (
      <div
        onClick={this.onClick}
        onTouchStart={this.onClick}
        style={{ cursor: 'pointer', width: `${width}px` }}
      >
        <svg height={height} width={width}>
          {this.renderVisibleVariants(visibleVariants)}
          {this.renderHoveredVariant(visibleVariants)}
          {this.renderCursor()}
        </svg>
        <PositionAxis
          invertOffset={invertOffset}
          width={width}
        />
      </div>
    )
  }
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
        <Navigator
          hoveredVariant={props.hoveredVariant}
          invertOffset={props.invertOffset}
          onNavigatorClick={props.onNavigatorClick}
          positionOffset={props.positionOffset}
          variants={props.variants}
          visibleVariantWindow={props.visibleVariantWindow}
          width={props.width}
          xScale={props.xScale}
        />
      </ReactCursorPosition>
    </NavigatorTrackContainer>
  )
}

NavigatorTrack.propTypes = {
  hoveredVariant: PropTypes.string.isRequired,
  invertOffset: PropTypes.func.isRequired,
  leftPanelWidth: PropTypes.number.isRequired,
  onNavigatorClick: PropTypes.func.isRequired,
  positionOffset: PropTypes.func.isRequired,
  title: PropTypes.string,
  variants: PropTypes.object.isRequired,
  visibleVariantWindow: PropTypes.arrayOf(PropTypes.number).isRequired,
  width: PropTypes.number.isRequired,
  xScale: PropTypes.func.isRequired,
}

NavigatorTrack.defaultProps = {
  title: '',
}

export default NavigatorTrack
