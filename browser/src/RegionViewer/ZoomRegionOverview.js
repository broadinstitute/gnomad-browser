import { debounce, throttle } from 'lodash-es'
import PropTypes from 'prop-types'
import React, { Component, forwardRef, useCallback, useImperativeHandle, useState } from 'react'
import ReactSlider from 'react-slider'
import styled from 'styled-components'
import GripLines from '@fortawesome/fontawesome-free/svgs/solid/grip-lines-vertical.svg'

import { Track } from '@gnomad/region-viewer'

import AutosizedRegionViewer from './AutosizedRegionViewer'

const draggable = C => {
  class DraggableComponent extends Component {
    static displayName = `Draggable(${C.displayName || C.name || 'Component'})`

    static propTypes = {
      onDrag: PropTypes.func.isRequired,
    }

    constructor(props) {
      super(props)
      this.dragStart = null
    }

    onMouseDown = e => {
      this.dragStart = e.clientX
      document.addEventListener('mouseup', this.onMouseUp)
      document.addEventListener('mousemove', this.onMouseMove)
    }

    onMouseUp = () => {
      this.dragStart = null
      document.removeEventListener('mouseup', this.onMouseUp)
      document.removeEventListener('mousemove', this.onMouseMove)
    }

    onMouseMove = throttle(e => {
      const { onDrag } = this.props
      if (this.dragStart !== null) {
        onDrag(e.clientX - this.dragStart)
        this.dragStart = e.clientX
      }
    }, 16)

    render() {
      const { onDrag, ...otherProps } = this.props
      return (
        <C
          {...otherProps}
          onMouseDown={this.onMouseDown}
          style={{ ...otherProps.style, cursor: 'grab' }}
        />
      )
    }
  }
  return DraggableComponent
}

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

const DraggableZoomRegionOverlay = draggable(ZoomRegionOverlay)

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

const SliderTrack = styled.div`
  top: 9px;
  height: 4px;
  border: 1px solid #333;
  border-radius: 4px;
  background: ${props => (props.index === 1 ? '#428bca' : '#f8f9fa')};
`

const ZoomRegionOverview = forwardRef(
  (
    {
      readOnly,
      regions,
      renderOverview,
      zoomRegion: initialZoomRegion,
      onChangeZoomRegion: onChangeZoomRegionCallback,
      onChangeZoomRegionDebounceDelay,
    },
    ref
  ) => {
    const [zoomRegion, setZoomRegion] = useState(initialZoomRegion)

    useImperativeHandle(
      ref,
      () => ({
        setZoomRegion,
      }),
      []
    )

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedOnChangeZoomRegionCallback = useCallback(
      debounce(onChangeZoomRegionCallback, onChangeZoomRegionDebounceDelay),
      [onChangeZoomRegionDebounceDelay]
    )

    const onChangeZoomRegion = useCallback(
      newZoomRegion => {
        setZoomRegion(newZoomRegion)
        debouncedOnChangeZoomRegionCallback(newZoomRegion)
      },
      [debouncedOnChangeZoomRegionCallback]
    )

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
                  {readOnly ? (
                    <ZoomRegionOverlay
                      style={{
                        left: `${zoomRegionStartX}px`,
                        width: `${zoomRegionStopX - zoomRegionStartX}px`,
                      }}
                    />
                  ) : (
                    <DraggableZoomRegionOverlay
                      onDrag={offset => {
                        onChangeZoomRegion({
                          start: Math.max(
                            regions[0].start,
                            scalePosition.invert(zoomRegionStartX + offset)
                          ),
                          stop: Math.min(
                            regions[regions.length - 1].stop,
                            scalePosition.invert(zoomRegionStopX + offset)
                          ),
                        })
                      }}
                      style={{
                        left: `${zoomRegionStartX}px`,
                        width: `${zoomRegionStopX - zoomRegionStartX}px`,
                      }}
                    />
                  )}
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
                    renderTrack={(props, state) => <SliderTrack {...props} index={state.index} />}
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
)

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
  onChangeZoomRegionDebounceDelay: PropTypes.number,
}

ZoomRegionOverview.defaultProps = {
  readOnly: true,
  onChangeZoomRegion: () => {},
  onChangeZoomRegionDebounceDelay: 0,
}

export default ZoomRegionOverview
