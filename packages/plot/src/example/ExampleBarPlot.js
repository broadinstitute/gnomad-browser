import React from 'react'
import { letterFrequency as data } from '@vx/mock-data'  // eslint-disable-line
import { Bar } from '@vx/shape'  // eslint-disable-line
import { Group } from '@vx/group'  // eslint-disable-line
import { scaleLinear, scaleBand } from '@vx/scale'  // eslint-disable-line

const width = 500
const height = 500
const margin = {
  top: 20,
  bottom: 20,
  right: 20,
  left: 20,
}

const xMax = width - margin.left - margin.right
const yMax = width - margin.top - margin.bottom

const x = d => d.letter
const y = d => d.frequency * 100

const xScale = scaleBand({

  domain: data.map(x),
  padding: 0.4,
})
const yScale = scaleLinear({
  range: [yMax, 0],
  domain: [0, Math.max(...data.map(y))],
})

const compose = (scale, accessor) => data => scale(accessor(data))
const xPoint = compose(xScale, x)
const yPoint = compose(yScale, y)

export default () => {
  return (
    <svg width={width} height={height}>
      {data.map((d, i) => {
        const barHeight = yMax - yPoint(d)
        return (
          <Group key={`bar-${i}`}>
            <Bar
              x={xPoint(d)}
              y={yMax - barHeight}
              height={barHeight}
              width={xScale.bandwidth()}
              fill={'#fc2e1c'}
            />
          </Group>
        )
      })}
    </svg>
  )
}
