/* eslint-disable react/prop-types */
import React, { PropTypes } from 'react'

import css from './styles.css'

const Axis = ({ height, title, width }) => {
  return <div className={css.yLabel}>{title}</div>
}

Axis.propTypes = {
  height: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  width: PropTypes.number.isRequired,
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
        className={css.rectangle}
        x={xScale(region.start - region.offset)}
        y={height / 2}
        key={`${i}-text`}
      >
        {i}
      </text>
  ),
    )}
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
    <div className={css.track}>
      <div className={css.yAxis}>
        <Axis
          height={height}
          width={leftPanelWidth}
          title={title}
        />
      </div>
      <div className={css.data}>
        <Positions
          width={width}
          height={height}
          offsetRegions={offsetRegions}
          xScale={xScale}
        />
        <div className={css.positionValues}>
          <table className={css.positionValuesTable} style={{width: "100%"}}>
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
                <tr style={{backgroundColor: region.color}} key={`${i}-row`}>
                  <td>{i}</td>
                  <td>{region.feature_type}</td>
                  <td>{region.start}</td>
                  <td>{region.stop}</td>
                  <td>{region.stop - region.start}</td>
                  <td>{region.previousRegionDistance}</td>
                  <td>{region.offset}</td>
                  <td>{xScale(region.start - region.offset).toPrecision(3)}</td>
                  <td>{xScale(region.stop - region.offset).toPrecision(3)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
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
