import { scaleLog } from 'd3-scale'
import PropTypes from 'prop-types'
import React, { forwardRef, useCallback, useEffect, useRef } from 'react'

const alleleFrequencyScale = scaleLog().domain([0.00001, 0.001]).range([4, 12])

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
  }, refs) // eslint-disable-line react-hooks/exhaustive-deps

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

export const VariantPlot = ({
  height,
  scalePosition,
  variants,
  variantColor,
  width,
  onHoverVariants,
}) => {
  const canvas = useRef(null)

  const variantsWithX = variants.map(variant => ({ variant, x: scalePosition(variant.pos) }))

  const findNearbyVariants = (x, threshold = 3) => {
    // TODO: optimize this using binary search in a copy of variants sorted by x
    return variantsWithX
      .map(({ variant, x: variantX }) => ({ variant, distance: Math.abs(x - variantX) }))
      .filter(({ distance }) => distance <= threshold)
      .sort(({ distance: d1 }, { distance: d2 }) => d1 - d2)
      .map(({ variant }) => variant)
  }

  let onMouseLeave
  let onMouseMove

  if (onHoverVariants) {
    onMouseMove = e => {
      const x = e.clientX - canvas.current.getBoundingClientRect().left
      onHoverVariants(findNearbyVariants(x))
    }

    onMouseLeave = () => {
      onHoverVariants([])
    }
  }

  return (
    <Canvas
      ref={canvas}
      height={height}
      width={width}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {ctx => {
        const markerY = height / 2

        ctx.clearRect(0, 0, width, height)
        ctx.lineWidth = 0.5
        ctx.strokeStyle = '#000'

        variantsWithX.forEach(({ variant, x }) => {
          let rx
          let ry

          const fill = variantColor(variant)
          if (!variant.allele_freq) {
            rx = 1
            ry = 1
          } else {
            rx = 3
            ry = alleleFrequencyScale(variant.allele_freq)
          }

          ctx.beginPath()
          drawEllipse(ctx, x, markerY, rx, ry)
          ctx.closePath()
          ctx.fillStyle = fill
          ctx.fill()
          ctx.lineWidth = 0.5
          ctx.setLineDash([])
          ctx.stroke()

          if (variant.isHighlighted) {
            ctx.beginPath()
            drawEllipse(ctx, x, markerY, rx + 5, ry + 5)
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
  height: PropTypes.number,
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
  variantColor: PropTypes.func,
  width: PropTypes.number.isRequired,
  onHoverVariants: PropTypes.func,
}

VariantPlot.defaultProps = {
  height: 60,
  variantColor: () => '#757575',
  onHoverVariants: undefined,
}
