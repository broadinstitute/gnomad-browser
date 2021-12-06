import PropTypes from 'prop-types'
import React from 'react'
import ReactSlider from 'react-slider'
import styled from 'styled-components'
import GripLines from '@fortawesome/fontawesome-free/svgs/solid/grip-lines-vertical.svg'

import { Track } from '@gnomad/region-viewer'

import AutosizedRegionViewer from './AutosizedRegionViewer'

const OverviewWrapper = styled.div`
  position: relative;
  box-sizing: border-box;
  padding: 1em 0;
`

const ZoomRegionOverlay = styled.div`
  position: absolute;
  top: 0;
  box-sizing: border-box;
  height: 100%;
  border: 1px solid #333;
  background: rgba(0, 0, 0, 0.1);
`

const StyledSlider = styled(ReactSlider)`
  width: 100%;
  height: 25px;
  margin-top: 3px;
`

const SliderThumb = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 24px;
  height: 24px;
  border: 1px solid #6c757d;
  border-radius: 3px;
  background: #f8f9fa;
  cursor: grab;
  line-height: 24px;
  text-align: center;
`

const ZoomRegionOverview = ({
  readOnly,
  regions,
  renderOverview,
  zoomRegion,
  onChangeZoomRegion,
}) => {
  return (
    <AutosizedRegionViewer regions={regions} leftPanelWidth={0} rightPanelWidth={0}>
      <Track>
        {({ scalePosition, width, ...otherArgs }) => {
          const zoomRegionStartX = scalePosition(zoomRegion.start)
          const zoomRegionStopX = scalePosition(zoomRegion.stop)

          return (
            <>
              <OverviewWrapper>
                {renderOverview({ scalePosition, width, ...otherArgs })}
                <ZoomRegionOverlay
                  style={{
                    left: `${zoomRegionStartX}px`,
                    width: `${zoomRegionStopX - zoomRegionStartX}px`,
                  }}
                />
              </OverviewWrapper>

              {!readOnly && (
                <StyledSlider
                  ariaLabel={['Start position of zoom window', 'Stop position of zoom window']}
                  ariaValuetext={state =>
                    state.value.map(n => scalePosition.invert(n).toLocaleString()).join(' to ')
                  }
                  min={0}
                  max={width}
                  value={[zoomRegionStartX, zoomRegionStopX]}
                  minDistance={1}
                  renderThumb={props => (
                    <SliderThumb {...props}>
                      <img src={GripLines} alt="" aria-hidden="true" width={16} height={16} />
                    </SliderThumb>
                  )}
                  onChange={value => {
                    onChangeZoomRegion({
                      start: scalePosition.invert(value[0]),
                      stop: scalePosition.invert(value[1]),
                    })
                  }}
                />
              )}
            </>
          )
        }}
      </Track>
    </AutosizedRegionViewer>
  )
}

ZoomRegionOverview.propTypes = {
  readOnly: PropTypes.bool,
  regions: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
    })
  ).isRequired,
  renderOverview: PropTypes.func.isRequired,
  zoomRegion: PropTypes.shape({
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
  onChangeZoomRegion: PropTypes.func,
}

ZoomRegionOverview.defaultProps = {
  readOnly: true,
  onChangeZoomRegion: () => {},
}

export default ZoomRegionOverview
