/* eslint-disable react/prop-types */
import React from 'react'
import styled from 'styled-components'
import PropTypes from 'prop-types'
import { scaleLog } from 'd3-scale'

import { getCategoryFromConsequence } from '@broad/utilities/src/constants/categoryDefinitions'


const VariantAxis = ({ title, height, leftPanelWidth }) => {
  const [dataset, subset, variant, count] = title.split('|')

  if (!dataset) {
    return <div style={{ width: leftPanelWidth }} />
  }

  return (
    <div style={{ width: leftPanelWidth }}>
      <svg width={leftPanelWidth} height={height}>
        <text
          x={0}
          y={(height * 0.20)}

        >
          {dataset}
        </text>
        <text
          x={0}
          y={height / 2}

        >
          {`${subset}`}
        </text>
        <text
          x={0}
          y={height * 0.80}

        >
          {count}
        </text>
      </svg>
    </div>
  )
}

VariantAxis.propTypes = {
  title: PropTypes.string.isRequired,
  leftPanelWidth: PropTypes.number.isRequired,
}

const VariantExacClassic = ({
  xScale,
  offsetPosition,
  yPosition,
  // circleRadius,
  circleStroke,
  circleStrokeWidth,
  variant,
  afScale,
}) => {
  const exacClassicColors = {
    all: '#757575',
    missense: '#F0C94D',
    lof: '#FF583F',
    synonymous: 'green',
  }
  const localColor = exacClassicColors[getCategoryFromConsequence(variant.consequence)]
  if (variant.allele_freq === 0) {
    // TODO add back hover effect
    return (
      <circle
        cx={xScale(offsetPosition)}
        cy={yPosition}
        r={1}
        fill={'white'}
        strokeWidth={circleStrokeWidth || 0}
        stroke={circleStroke || 0}
      />
    )
  }
  return (
    <ellipse
      cx={xScale(offsetPosition)}
      cy={yPosition}
      ry={afScale(variant.allele_freq)}
      rx={3}
      opacity={0.7}
      fill={localColor}
      strokeWidth={circleStrokeWidth || 0}
      stroke={circleStroke || 0}
    />
  )
}

const VariantCircle = ({
  xScale,
  offsetPosition,
  yPosition,
  fillColor,
  circleRadius,
  circleStroke,
  circleStrokeWidth,
}) => {
  return (
    <circle
      cx={xScale(offsetPosition)}
      cy={yPosition}
      r={circleRadius || 2}
      fill={fillColor}
      strokeWidth={circleStrokeWidth || 0}
      stroke={circleStroke || 0}
    />
  )
}

const getVariantMarker = ({ markerType, markerKey, ...rest }) => {
  switch (markerType) {
    case 'circle':
      return <VariantCircle key={markerKey} {...rest} />
    case 'exacClassic':
    default:
      return <VariantExacClassic key={markerKey} {...rest} />
  }
}


const VariantTrack = ({
  title,
  width,
  height,
  leftPanelWidth,
  variants,
  positionOffset,
  markerConfig,
  color,
  ...rest
}) => {
  const VariantTrackContainer = styled.div`
    display: flex;
    align-items: center;
    margin-top: 5px;
  `



  return (
    <VariantTrackContainer>
      <VariantAxis
        height={height}
        leftPanelWidth={leftPanelWidth}
        title={title}
      />
      <div>
        <svg
          width={width}
          height={height}
        >
          {variants.toJS().map((variant, index) => {
            const {
              markerType,
              afMax,
            } = markerConfig

            const yPosition = Math.floor(height / 2)

            const regionViewerAttributes = positionOffset(variant.pos)
            const markerKey = `${title.replace(' ', '_')}-${index}-${markerType}`

            // if (regionViewerAttributes === 0) return  // TODO: what is this for
            const afScale =
              scaleLog()
                .domain([
                  0.000010,
                  afMax,
                ])
                .range([4, 12])

            const childProps = {
              index,
              ...regionViewerAttributes,
              ...rest,
              ...markerConfig,
              markerKey,
              yPosition,
              variant,
              afScale,
            }

            return getVariantMarker(childProps)
          })}
        </svg>
      </div>
    </VariantTrackContainer>
  )
}
VariantTrack.propTypes = {
  title: PropTypes.string.isRequired,
  height: PropTypes.number.isRequired,
  variants: PropTypes.any.isRequired,
  width: PropTypes.number,  // eslint-disable-line
  positionOffset: PropTypes.func,  // eslint-disable-line
  xScale: PropTypes.func,  // eslint-disable-line
  color: PropTypes.string,
  markerConfig: PropTypes.object,
}
VariantTrack.defaultProps = {
  title: '',
  color: 'grey',
  markerConfig: {
    markerType: 'circle',
    radius: 3,
    stroke: 'black',
    strokeWidth: 1,
    fillColor: '#757575',
  },
}

export default VariantTrack
