import { debounce, throttle } from 'lodash-es'
import PropTypes from 'prop-types'
import React, { Component, forwardRef, useCallback, useImperativeHandle, useState } from 'react'
import ReactSlider from 'react-slider'
import styled from 'styled-components'
// @ts-expect-error TS(2307) FIXME: Cannot find module '@fortawesome/fontawesome-free/... Remove this comment to see the full error message
import GripLines from '@fortawesome/fontawesome-free/svgs/solid/grip-lines-vertical.svg'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { Track } from '@gnomad/region-viewer'

import AutosizedRegionViewer from './AutosizedRegionViewer'

const draggable = (C: any) => {
  class DraggableComponent extends Component {
    static displayName = `Draggable(${C.displayName || C.name || 'Component'})`

    static propTypes = {
      onDrag: PropTypes.func.isRequired,
    }

    dragStart: any

    constructor(props: any) {
      super(props)
      this.dragStart = null
    }

    onMouseDown = (e: any) => {
      this.dragStart = e.clientX
      document.addEventListener('mouseup', this.onMouseUp)
      document.addEventListener('mousemove', this.onMouseMove)
    }

    onMouseUp = () => {
      this.dragStart = null
      document.removeEventListener('mouseup', this.onMouseUp)
      document.removeEventListener('mousemove', this.onMouseMove)
    }

    onMouseMove = throttle((e: any) => {
      // @ts-expect-error TS(2339) FIXME: Property 'onDrag' does not exist on type 'Readonly... Remove this comment to see the full error message
      const { onDrag } = this.props
      if (this.dragStart !== null) {
        onDrag(e.clientX - this.dragStart)
        this.dragStart = e.clientX
      }
    }, 16)

    render() {
      // @ts-expect-error TS(2339) FIXME: Property 'onDrag' does not exist on type 'Readonly... Remove this comment to see the full error message
      const { onDrag, ...otherProps } = this.props
      return (
        <C
          {...otherProps}
          onMouseDown={this.onMouseDown}
          style={{ ...(otherProps as any).style, cursor: 'grab' }}
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
  background: ${(props: any) => (props.index === 1 ? '#428bca' : '#f8f9fa')};
`

type ZoomRegionOverviewProps = {
  readOnly?: boolean
  regions: {
    start: number
    stop: number
  }[]
  renderOverview: (...args: any[]) => any
  zoomRegion: {
    start: number
    stop: number
  }
  onChangeZoomRegion?: (...args: any[]) => any
  onChangeZoomRegionDebounceDelay?: number
}

const ZoomRegionOverview = forwardRef<any, ZoomRegionOverviewProps>(
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
      // @ts-expect-error TS(2345) FIXME: Argument of type '((...args: any[]) => any) | unde... Remove this comment to see the full error message
      debounce(onChangeZoomRegionCallback, onChangeZoomRegionDebounceDelay),
      [onChangeZoomRegionDebounceDelay]
    )

    const onChangeZoomRegion = useCallback(
      // @ts-expect-error TS(7006) FIXME: Parameter 'newZoomRegion' implicitly has an 'any' ... Remove this comment to see the full error message
      (newZoomRegion) => {
        setZoomRegion(newZoomRegion)
        debouncedOnChangeZoomRegionCallback(newZoomRegion)
      },
      [debouncedOnChangeZoomRegionCallback]
    )

    return (
      <AutosizedRegionViewer regions={regions} leftPanelWidth={0} rightPanelWidth={0}>
        <Track>
          {({ scalePosition, width, ...otherArgs }: any) => {
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
                      onDrag={(offset) => {
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
                      // @ts-expect-error TS(2322) FIXME: Type '{ onDrag: (offset: any) => void; style: { le... Remove this comment to see the full error message
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
                    ariaValuetext={(state: any) =>
                      state.value
                        .map((n: any) => scalePosition.invert(n).toLocaleString())
                        .join(' to ')
                    }
                    min={0}
                    max={width}
                    value={[zoomRegionStartX, zoomRegionStopX]}
                    minDistance={1}
                    renderThumb={(props: any) => (
                      <SliderThumb {...props}>
                        <img src={GripLines} alt="" aria-hidden="true" width={16} height={16} />
                      </SliderThumb>
                    )}
                    renderTrack={(props: any, state: any) => (
                      <SliderTrack {...props} index={state.index} />
                    )}
                    onChange={(value: any) => {
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

ZoomRegionOverview.defaultProps = {
  readOnly: true,
  onChangeZoomRegion: () => {},
  onChangeZoomRegionDebounceDelay: 0,
}

export default ZoomRegionOverview
