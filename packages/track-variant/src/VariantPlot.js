import { scaleLog } from 'd3-scale'
import { transparentize } from 'polished'
import PropTypes from 'prop-types'
import React, { forwardRef, useCallback, useEffect, useRef } from 'react'

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

const useCombinedRefs = refs =>
  useCallback(element => {
    refs.forEach(ref => {
      if (!ref) {
        return
      }

      if (typeof ref === 'function') {
        ref(element)
      } else {
        ref.current = element // eslint-disable-line no-param-reassign
      }
    })
  }, refs)

const Canvas = forwardRef(({ children, height, width, ...otherProps }, ref) => {
  const element = useRef(null)
  const refs = useCombinedRefs([element, ref])

  const scale = window.devicePixelRatio || 1

  useEffect(() => {
    if (!element.current) {
      return
    }

    const context = element.current.getContext('2d')
    context.setTransform(scale, 0, 0, scale, 0, 0)
    children(context)
  })

  return (
    <canvas
      {...otherProps}
      ref={refs}
      height={height * scale}
      width={width * scale}
      style={{
        height: `${height}px`,
        width: `${width}px`,
      }}
    />
  )
})

Canvas.propTypes = {
  children: PropTypes.func.isRequired,
  height: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
}

export const VariantPlot = ({ height, scalePosition, variants, width }) => {
  return (
    <Canvas height={height} width={width}>
      {ctx => {
        const markerY = height / 2

        ctx.clearRect(0, 0, width, height)
        ctx.lineWidth = 0.5
        ctx.strokeStyle = '#000'

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

          ctx.beginPath()
          drawEllipse(ctx, markerX, markerY, rx, ry)
          ctx.closePath()
          ctx.fillStyle = fill
          ctx.fill()
          ctx.lineWidth = 0.5
          ctx.setLineDash([])
          ctx.stroke()

          if (variant.isHighlighted) {
            ctx.beginPath()
            drawEllipse(ctx, markerX, markerY, rx + 5, ry + 5)
            ctx.closePath()
            ctx.lineWidth = 1
            ctx.setLineDash([3, 3])
            ctx.stroke()
          }
        })
      }}
    </Canvas>
  )
}

VariantPlot.propTypes = {
  height: PropTypes.number.isRequired,
  scalePosition: PropTypes.func.isRequired,
  variants: PropTypes.arrayOf(
    PropTypes.shape({
      allele_freq: PropTypes.number,
      consequence: PropTypes.string,
      isHighlighted: PropTypes.bool,
      pos: PropTypes.number.isRequired,
      variant_id: PropTypes.string.isRequired,
    })
  ).isRequired,
  width: PropTypes.number.isRequired,
}
