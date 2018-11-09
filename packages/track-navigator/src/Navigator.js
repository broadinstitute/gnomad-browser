import { scaleLog } from 'd3-scale'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import ReactCursorPosition from 'react-cursor-position'
import styled from 'styled-components'

import { VariantAlleleFrequencyPlot } from '@broad/track-variant'

import PositionAxis from './PositionAxis'


const afScale = scaleLog()
  .domain([0.000010, 0.001])
  .range([4, 12])


const NavigatorContainer = styled.div`
  cursor: pointer;
  position: relative;
  width: ${props => props.width}px;
`


const NavigatorOverlay = styled.svg`
  left: 0;
  position: absolute;
  top: 0;
`

const getTableIndexByPosition = (position, variants) => {
  if (variants.size) {
    return variants.findIndex((variant, i) => {
      if (variants.get(i + 1)) {
        return position >= variant.pos && position <= variants.get(i + 1).pos
      }
      return variants.size - 1
    })
  }
  return variants.findIndex((variant, i) => {
    if (variants[i + 1]) {
      return position >= variant.pos && position <= variants[i + 1].pos
    }
    return variants.length - 1
  })
}

class Navigator extends Component {
  static propTypes = {
    height: PropTypes.number,
    hoveredVariant: PropTypes.string,
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
    hoveredVariant: null,
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

    const ry = variant.allele_freq
      ? afScale(variant.allele_freq) + 4
      : 4

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
      width,
      xScale,
    } = this.props

    return (
      <VariantAlleleFrequencyPlot
        height={height}
        positionOffset={positionOffset}
        variants={visibleVariants}
        width={width}
        xScale={xScale}
      />
    )
  }

  render() {
    const {
      height,
      hoveredVariant,
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
      <NavigatorContainer
        onClick={this.onClick}
        onTouchStart={this.onClick}
        width={width}
      >
        {this.renderVisibleVariants(visibleVariants)}
        <NavigatorOverlay height={height} width={width}>
          {hoveredVariant && this.renderHoveredVariant(visibleVariants)}
          {this.renderCursor()}
        </NavigatorOverlay>
        <PositionAxis
          invertOffset={invertOffset}
          width={width}
        />
      </NavigatorContainer>
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
  hoveredVariant: PropTypes.string,
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
  hoveredVariant: null,
  title: '',
}

export default NavigatorTrack
