/* eslint-disable react/prop-types */
import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

const PositionTableTrackWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`

const Axis = ({ title }) => {
  return <div>{title}</div>
}

Axis.propTypes = {
  title: PropTypes.string.isRequired,
}

const Positions = ({
  width,
  height,
  offsetRegions,
  xScale,
}) => (
  <svg
    width={width}
    height={height}
  >
    {offsetRegions.map((region, i) => (
      <text
        style={{ fontSize: '8px' }}
        x={xScale(region.start - region.offset)}
        y={height / 2}
        key={`${region.start}-text`}
      >
        {i}
      </text>
    ))}
  </svg>
)

const PositionTableTrack = ({
  width,
  height,
  leftPanelWidth,
  offsetRegions,
  xScale,
  title,
}) => {
  return (
    <PositionTableTrackWrapper>
      <div>
        <Axis
          height={height}
          width={leftPanelWidth}
          title={title}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* <Positions
          width={width}
          height={height}
          offsetRegions={offsetRegions}
          xScale={xScale}
        /> */}
        <div>
          <table style={{ width }}>
            <thead>
              <tr>
                <th>index</th>
                <th>feature_type</th>
                <th>start</th>
                <th>stop</th>
                <th>size</th>
                <th>previous region distance</th>
                <th>offset</th>
                <th>start scaled</th>
                <th>stop stop scaled</th>
              </tr>
            </thead>
            <tbody>
              {offsetRegions.map((region, i) =>
                (<tr key={`${region.start}-row`}>
                  <td>{i}</td>
                  <td>{region.feature_type}</td>
                  <td>{region.start}</td>
                  <td>{region.stop}</td>
                  <td>{region.stop - region.start}</td>
                  <td>{region.previousRegionDistance}</td>
                  <td>{region.offset}</td>
                  <td>{xScale(region.start - region.offset).toPrecision(3)}</td>
                  <td>{xScale(region.stop - region.offset).toPrecision(3)}</td>
                </tr>)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PositionTableTrackWrapper>
  )
}
PositionTableTrack.propTypes = {
  height: PropTypes.number.isRequired,
  width: PropTypes.number, // eslint-disable-line
  leftPanelWidth: PropTypes.number, // eslint-disable-line
  xScale: PropTypes.func, // eslint-disable-line
  positionOffset: PropTypes.func,  // eslint-disable-line
}

export default PositionTableTrack
