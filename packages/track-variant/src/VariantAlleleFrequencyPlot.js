import { scaleLog } from 'd3-scale'
import { transparentize } from 'polished'
import PropTypes from 'prop-types'
import React, { Component } from 'react'

import { getCategoryFromConsequence } from '@broad/utilities'

const exacClassicColors = {
  lof: transparentize(0.3, '#FF583F'),
  missense: transparentize(0.3, '#F0C94D'),
  synonymous: transparentize(0.3, 'green'),
  other: transparentize(0.3, '#757575'),
}

const alleleFrequencyScale = scaleLog()
  .domain([0.00001, 0.001])
  .range([4, 12])

const CANVAS_SCALE = window.devicePixelRatio || 1

const drawEllipse = (ctx, cx, cy, rx, ry) => {
  const K = 0.5522848

  const xOffset = rx * K
  const yOffset = ry * K

  const x1 = cx - rx
  const y1 = cy - ry

  const x2 = cx + rx
  const y2 = cy + ry

  ctx.moveTo(x1, cy)
  ctx.bezierCurveTo(x1, cy - yOffset, cx - xOffset, y1, cx, y1)
  ctx.bezierCurveTo(cx + xOffset, y1, x2, cy - yOffset, x2, cy)
  ctx.bezierCurveTo(x2, cy + yOffset, cx + xOffset, y2, cx, y2)
  ctx.bezierCurveTo(cx - xOffset, y2, x1, cy + yOffset, x1, cy)
}

export class VariantAlleleFrequencyPlot extends Component {
  static propTypes = {
    height: PropTypes.number.isRequired,
    scalePosition: PropTypes.func.isRequired,
    variants: PropTypes.arrayOf(
      PropTypes.shape({
        allele_freq: PropTypes.number,
        consequence: PropTypes.string,
        pos: PropTypes.number.isRequired,
        variant_id: PropTypes.string.isRequired,
      })
    ).isRequired,
    width: PropTypes.number.isRequired,
  }

  componentDidMount() {
    this.draw()
  }

  componentDidUpdate() {
    this.draw()
  }

  canvasRef = el => {
    this.ctx = el ? el.getContext('2d') : null
  }

  draw() {
    const { height, scalePosition, variants, width } = this.props

    const markerY = height / 2

    this.ctx.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0)
    this.ctx.clearRect(0, 0, width, height)
    this.ctx.lineWidth = 0.5
    this.ctx.strokeStyle = '#000'

    variants.forEach(variant => {
      const markerX = scalePosition(variant.pos)

      let fill
      let rx
      let ry

      if (!variant.allele_freq) {
        fill = 'white'
        rx = 1
        ry = 1
      } else {
        const category = getCategoryFromConsequence(variant.consequence) || 'other'
        fill = exacClassicColors[category]
        rx = 3
        ry = alleleFrequencyScale(variant.allele_freq)
      }

      this.ctx.beginPath()
      drawEllipse(this.ctx, markerX, markerY, rx, ry)
      this.ctx.closePath()
      this.ctx.fillStyle = fill
      this.ctx.fill()
      this.ctx.stroke()
    })
  }

  render() {
    const { height, width } = this.props

    return (
      <canvas
        ref={this.canvasRef}
        height={height * CANVAS_SCALE}
        width={width * CANVAS_SCALE}
        style={{
          height: `${height}px`,
          width: `${width}px`,
        }}
      />
    )
  }
}
