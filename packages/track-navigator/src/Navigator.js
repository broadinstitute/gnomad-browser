import { scaleLog } from 'd3-scale'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { VariantAlleleFrequencyPlot } from '@broad/track-variant'

import PositionAxis from './PositionAxis'

const afScale = scaleLog()
  .domain([0.00001, 0.001])
  .range([4, 12])

const NavigatorContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  width: ${props => props.width}px;
  cursor: pointer;
`

const NavigatorOverlay = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
`

export class Navigator extends Component {
  static propTypes = {
    height: PropTypes.number,
    hoveredVariant: PropTypes.string,
    isPositionOutside: PropTypes.bool,
    onNavigatorClick: PropTypes.func.isRequired,
    position: PropTypes.shape({
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
    }),
    scalePosition: PropTypes.func.isRequired,
    variants: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
    visibleVariantWindow: PropTypes.arrayOf(PropTypes.number).isRequired,
    width: PropTypes.number.isRequired,
  }

  static defaultProps = {
    height: 60,
    hoveredVariant: null,
    isPositionOutside: true,
    position: undefined,
  }

  onClick = () => {
    const { onNavigatorClick, position, scalePosition } = this.props
    const genomePosition = scalePosition.invert(position.x)
    onNavigatorClick(genomePosition)
  }

  renderCursor() {
    const { height, isPositionOutside, position } = this.props

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
    const { height, hoveredVariant, scalePosition } = this.props

    const variant = visibleVariants.find(v => v.variant_id === hoveredVariant)
    if (!variant) {
      return null
    }

    const ry = variant.allele_freq ? afScale(variant.allele_freq) + 4 : 4

    const x = scalePosition(variant.pos)

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
    const { height, scalePosition, width } = this.props
    return (
      <VariantAlleleFrequencyPlot
        height={height}
        scalePosition={scalePosition}
        variants={visibleVariants}
        width={width}
      />
    )
  }

  render() {
    const {
      height,
      hoveredVariant,
      scalePosition,
      variants,
      visibleVariantWindow,
      width,
    } = this.props

    const visibleVariants = variants.slice(visibleVariantWindow[0], visibleVariantWindow[1] + 1)

    return (
      <NavigatorContainer onClick={this.onClick} onTouchStart={this.onClick} width={width}>
        {this.renderVisibleVariants(visibleVariants)}
        <NavigatorOverlay height={height} width={width}>
          {hoveredVariant && this.renderHoveredVariant(visibleVariants)}
          {this.renderCursor()}
        </NavigatorOverlay>
        <PositionAxis scalePosition={scalePosition} width={width} />
      </NavigatorContainer>
    )
  }
}
