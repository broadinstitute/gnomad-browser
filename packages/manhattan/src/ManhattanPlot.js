import { extent } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import throttle from 'lodash.throttle'
import PropTypes from 'prop-types'
import React, { useEffect, useMemo, useRef } from 'react'

import { rotateColorByChromosome } from './colorScales'

export const ManhattanPlot = ({
  chromosomes,
  dataPoints,
  height,
  onClickPoint,
  pointColor,
  pointLabel,
  thresholdColor,
  thresholdLabel,
  thresholdValue,
  width,
  xLabel,
  yLabel,
}) => {
  const positionExtents = chromosomes.reduce(
    (acc, chr) => ({ ...acc, [chr]: { min: Infinity, max: -Infinity } }),
    Object.create(null)
  )

  for (let i = 0; i < dataPoints.length; i += 1) {
    const d = dataPoints[i]
    positionExtents[d.chrom].min = Math.min(positionExtents[d.chrom].min, d.pos)
    positionExtents[d.chrom].max = Math.max(positionExtents[d.chrom].max, d.pos)
  }

  const chromOffset = {}
  let cumulativePosition = 0
  for (let i = 0; i < chromosomes.length; i += 1) {
    const chr = chromosomes[i]
    chromOffset[chr] = cumulativePosition
    cumulativePosition += Math.max(0, positionExtents[chr].max - positionExtents[chr].min)
  }

  const margin = {
    bottom: 55,
    left: 60,
    right: 10,
    top: 10,
  }

  const xScale = scaleLinear()
    .domain([0, cumulativePosition])
    .range([0, width - margin.left - margin.right])

  const yExtent = extent(dataPoints, d => d.pval)
    .map(p => -Math.log10(p))
    .reverse()

  const yScale = scaleLinear()
    .domain(yExtent)
    .range([height - margin.top - margin.bottom, 0])
    .nice()

  const points = dataPoints.map(d => ({
    data: d,
    x: xScale(chromOffset[d.chrom] + d.pos - positionExtents[d.chrom].min),
    y: yScale(-Math.log10(d.pval)),
  }))

  const scale = window.devicePixelRatio || 1

  const plotCanvas = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.height = height * scale
    canvas.width = width * scale

    const ctx = canvas.getContext('2d')

    ctx.setTransform(scale, 0, 0, scale, 0, 0)

    ctx.lineWidth = 1

    const w = width - margin.left - margin.right
    const h = height - margin.top - margin.bottom

    // Y Axis
    // ====================================================

    ctx.save()

    ctx.transform(1, 0, 0, 1, margin.left, margin.top)

    const ticks = yScale.ticks()
    for (let i = 0; i < ticks.length; i += 1) {
      const t = ticks[i]
      const y = yScale(t)

      ctx.beginPath()
      ctx.moveTo(-5, y)
      ctx.lineTo(0, y)
      ctx.strokeStyle = '#333'
      ctx.stroke()

      ctx.font = '10px sans-serif'
      ctx.fillStyle = '#000'
      const { width: tickLabelWidth } = ctx.measureText(`${t}`)
      ctx.fillText(`${t}`, -(9 + tickLabelWidth), y + 3)

      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.strokeStyle = '#bdbdbd'
      ctx.stroke()
    }

    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, h)
    ctx.strokeStyle = '#333'
    ctx.stroke()

    ctx.font = '14px sans-serif'
    const { width: yLabelWidth } = ctx.measureText(yLabel)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(yLabel, -(h + yLabelWidth) / 2, -40)

    ctx.restore()

    // X Axis
    // ====================================================

    ctx.save()

    ctx.transform(1, 0, 0, 1, margin.left, height - margin.bottom)

    for (let i = 0; i < chromosomes.length; i += 1) {
      const chr = chromosomes[i]

      const x = xScale(chromOffset[chr] + (positionExtents[chr].max - positionExtents[chr].min) / 2)

      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, 3)
      ctx.strokeStyle = '#333'
      ctx.stroke()

      ctx.font = '10px sans-serif'
      ctx.fillStyle = '#000'
      const { width: tickLabelWidth } = ctx.measureText(chr)
      ctx.fillText(chr, x - tickLabelWidth / 2, 13)
    }

    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(w, 0)
    ctx.strokeStyle = '#333'
    ctx.stroke()

    ctx.font = '14px sans-serif'
    const { width: xLabelWidth } = ctx.measureText(xLabel)
    ctx.fillText(xLabel, (w - xLabelWidth) / 2, 50)

    ctx.restore()

    // Significance threshold
    // ====================================================

    if (thresholdValue !== undefined) {
      ctx.save()

      ctx.transform(1, 0, 0, 1, margin.left, margin.top)

      const thresholdY = yScale(-Math.log10(thresholdValue))
      ctx.beginPath()
      ctx.moveTo(0, thresholdY)
      ctx.lineTo(w, thresholdY)
      ctx.setLineDash([3, 3])
      ctx.lineWidth = 2
      ctx.strokeStyle = thresholdColor
      ctx.stroke()

      if (thresholdLabel !== undefined) {
        ctx.font = '10px sans-serif'
        ctx.fillStyle = '#000'
        ctx.fillText(thresholdLabel, 2, thresholdY - 4)
      }

      ctx.restore()
    }

    // Points
    // ====================================================

    ctx.save()

    ctx.transform(1, 0, 0, 1, margin.left, margin.top)

    if (ctx.clip) {
      ctx.beginPath()
      ctx.rect(1, 1, w - 2, h - 2)
      ctx.clip()
    }

    for (let i = 0; i < points.length; i += 1) {
      const point = points[i]

      ctx.beginPath()
      ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI, false)
      ctx.fillStyle = pointColor(point.data)
      ctx.fill()
    }

    ctx.restore()

    return canvas
  }, [chromosomes, dataPoints, height, pointColor, width, xLabel, yLabel])

  const mainCanvas = useRef()

  const drawPlot = () => {
    const ctx = mainCanvas.current.getContext('2d')
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(plotCanvas, 0, 0, width, height)
  }

  useEffect(drawPlot)

  const findNearestPoint = (x, y, distanceThreshold = 5) => {
    let nearestPoint
    let minDistance = Infinity

    for (let i = 0; i < points.length; i += 1) {
      const p = points[i]
      const d = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2)
      if (d < minDistance) {
        nearestPoint = p
        minDistance = d
      }
    }

    return minDistance <= distanceThreshold ? nearestPoint : undefined
  }

  const updateHoveredPoint = throttle((x, y) => {
    const nearestPoint = findNearestPoint(x, y)

    drawPlot()

    if (nearestPoint) {
      const ctx = mainCanvas.current.getContext('2d')
      ctx.save()

      ctx.transform(1, 0, 0, 1, margin.left, margin.top)

      ctx.font = '14px sans-serif'
      const label = pointLabel(nearestPoint.data)
      const { width: textWidth } = ctx.measureText(label)

      const labelX = x < width / 2 ? nearestPoint.x : nearestPoint.x - textWidth - 10
      const labelY = y < 30 ? nearestPoint.y : nearestPoint.y - 24

      ctx.beginPath()
      ctx.rect(labelX, labelY, textWidth + 12, 24)
      ctx.fillStyle = '#000'
      ctx.fill()

      ctx.fillStyle = '#fff'
      ctx.fillText(label, labelX + 6, labelY + 16)

      ctx.restore()
    }
  }, 100)

  const onMouseMove = e => {
    const bounds = e.target.getBoundingClientRect()
    const mouseX = e.clientX - bounds.left - margin.left
    const mouseY = e.clientY - bounds.top - margin.top
    updateHoveredPoint(mouseX, mouseY)
  }

  const onClick = e => {
    const bounds = e.target.getBoundingClientRect()
    const clickX = e.clientX - bounds.left - margin.left
    const clickY = e.clientY - bounds.top - margin.top

    const point = findNearestPoint(clickX, clickY)
    if (point) {
      onClickPoint(point.data)
    }
  }

  return (
    <canvas
      ref={mainCanvas}
      height={height * scale}
      width={width * scale}
      style={{
        height: `${height}px`,
        width: `${width}px`,
      }}
      onClick={onClick}
      onMouseLeave={drawPlot}
      onMouseMove={onMouseMove}
    />
  )
}

ManhattanPlot.propTypes = {
  chromosomes: PropTypes.arrayOf(PropTypes.string),
  dataPoints: PropTypes.arrayOf(
    PropTypes.shape({
      chrom: PropTypes.string.isRequired,
      pos: PropTypes.number.isRequired,
      pval: PropTypes.number.isRequired,
    })
  ).isRequired,
  height: PropTypes.number.isRequired,
  onClickPoint: PropTypes.func,
  pointColor: PropTypes.func,
  pointLabel: PropTypes.func,
  thresholdColor: PropTypes.string,
  thresholdLabel: PropTypes.string,
  thresholdValue: PropTypes.number,
  width: PropTypes.number.isRequired,
  xLabel: PropTypes.string,
  yLabel: PropTypes.string,
}

const CHROMOSOMES = Array.from(new Array(22), (_, i) => `${i + 1}`).concat(['X', 'Y'])

ManhattanPlot.defaultProps = {
  chromosomes: CHROMOSOMES,
  onClickPoint: () => {},
  pointColor: rotateColorByChromosome(['rgb(139,53,40)', 'rgb(60,100,166)'], CHROMOSOMES),
  pointLabel: d => d.label,
  thresholdColor: 'rgb(139,53,40)',
  thresholdLabel: undefined,
  thresholdValue: undefined,
  xLabel: 'Chromosome',
  yLabel: '-log10(p)',
}
