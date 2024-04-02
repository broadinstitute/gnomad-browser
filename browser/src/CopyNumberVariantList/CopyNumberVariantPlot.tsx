import React from 'react'

type Props = {
  color: string
  isHighlighted: boolean
  isPositionDefined: (...args: any[]) => any
  scalePosition: (...args: any[]) => any
  variant: {
    pos: number
    end: number
    type: string
  }
  width: number
}

const CopyNumberVariantPlot = ({
  color,
  isHighlighted,
  isPositionDefined,
  scalePosition,
  variant,
  width,
}: Props) => {
  const trackHeight = 14
  const barHeight = 10
  const barY = Math.floor((trackHeight - barHeight) / 2)
  const arrowWidth = 3
  const halfBarHeight = barHeight / 2

  // For SV classes that are not represented by a single point, exclude the padding base from the track.
  // See https://github.com/broadinstitute/gnomad-browser/issues/687
  let startX = scalePosition(variant.pos + 1)
  let stopX = scalePosition(variant.end)

  const startIsDefined = isPositionDefined(variant.pos + 1)
  const stopIsDefined = isPositionDefined(variant.end)

  // Set a minimum width for bars.
  if (startIsDefined && stopIsDefined && stopX - startX < 3) {
    const diff = 3 - (stopX - startX)
    startX -= diff / 2
    stopX += diff / 2
  }

  // If one endpoint is undefined, which should only happen if the SV extends outside the visible region,
  // offset the start/stop coordinate to make room for the arrow marker at the end of the bar.

  if (!startIsDefined) {
    startX += arrowWidth
  }
  if (!stopIsDefined) {
    stopX -= arrowWidth
  }

  return (
    <svg height={trackHeight} width={width} style={{ overflow: 'visible' }}>
      {isHighlighted && (
        <rect
          x={1}
          y={1}
          width={width - 2}
          height={trackHeight - 2}
          fill="none"
          stroke="black"
          strokeDasharray="3, 3"
          strokeWidth={1}
        />
      )}
      <line
        x1={0}
        x2={width}
        y1={trackHeight / 2}
        y2={trackHeight / 2}
        stroke="#bdbdbd"
        strokeWidth={1}
      />
      (
      <React.Fragment>
        {!startIsDefined && (
          <path
            d={`M ${startX} ${barY} l -${arrowWidth} ${halfBarHeight} l ${arrowWidth} ${halfBarHeight} z`}
            fill={color}
          />
        )}
        <rect x={startX} y={barY} width={stopX - startX} height={barHeight} fill={color} />
        {!stopIsDefined && (
          <path
            d={`M ${stopX} ${barY} l ${arrowWidth} ${halfBarHeight} l -${arrowWidth} ${halfBarHeight} z`}
            fill={color}
          />
        )}
      </React.Fragment>
      )
    </svg>
  )
}

export default CopyNumberVariantPlot
