import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import styled from 'styled-components'

import { Button, Input } from '@gnomad/ui'

import ZoomRegionOverview from './ZoomRegionOverview'

const Wrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  margin-bottom: 1em;

  input {
    margin-top: 0.25em;
  }
`

const RegionControlsWrapper = styled(Wrapper)`
  justify-content: space-around;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: center;
  }

  label,
  input {
    max-width: 130px;
  }
`

type Props = {
  defaultZoomRegion?: {
    start: number
    stop: number
  }
  regionViewerRegions: {
    start: number
    stop: number
  }[]
  renderOverview: (...args: any[]) => any
  onSubmit: (...args: any[]) => any
}

const ZoomRegionForm = forwardRef<any, Props>(
  ({ defaultZoomRegion, regionViewerRegions, renderOverview, onSubmit }, ref) => {
    const overviewRef = useRef(null)

    const [zoomRegion, _setZoomRegion] = useState(
      defaultZoomRegion || {
        start: regionViewerRegions[0].start,
        stop: regionViewerRegions[regionViewerRegions.length - 1].stop,
      }
    )
    // @ts-expect-error TS(7006) FIXME: Parameter 'newZoomRegion' implicitly has an 'any' ... Remove this comment to see the full error message
    const setZoomRegion = useCallback((newZoomRegion) => {
      _setZoomRegion(newZoomRegion)
      if (overviewRef.current) {
        ;(overviewRef.current as any).setZoomRegion(newZoomRegion)
      }
    }, [])

    const size = zoomRegion.stop - zoomRegion.start + 1

    let startPositionValidationError = null
    let stopPositionValidationError = null

    if (zoomRegion.start > zoomRegion.stop) {
      stopPositionValidationError = 'Stop position must be greater than or equal to start position.'
    }

    if (zoomRegion.start < regionViewerRegions[0].start) {
      startPositionValidationError = `Start position must be greater than or equal to ${regionViewerRegions[0].start.toLocaleString()}.`
    } else if (zoomRegion.start > regionViewerRegions[regionViewerRegions.length - 1].stop) {
      startPositionValidationError = `Start position must be less than or equal to ${regionViewerRegions[
        regionViewerRegions.length - 1
      ].stop.toLocaleString()}.`
    }

    if (zoomRegion.stop < regionViewerRegions[0].start) {
      stopPositionValidationError = `Stop position must be greater than or equal to ${regionViewerRegions[0].start.toLocaleString()}.`
    } else if (zoomRegion.stop > regionViewerRegions[regionViewerRegions.length - 1].stop) {
      stopPositionValidationError = `Stop position must be less than or equal to ${regionViewerRegions[
        regionViewerRegions.length - 1
      ].stop.toLocaleString()}.`
    }

    const isStartPositionValid = startPositionValidationError === null
    const isStopPositionValid = stopPositionValidationError === null
    const isValid = isStartPositionValid && isStopPositionValid

    const submit = useCallback(() => {
      if (isValid) {
        onSubmit(
          zoomRegion.start > regionViewerRegions[0].start ||
            zoomRegion.stop < regionViewerRegions[regionViewerRegions.length - 1].stop
            ? zoomRegion
            : null
        )
      }
    }, [isValid, regionViewerRegions, zoomRegion, onSubmit])

    useImperativeHandle(ref, () => ({
      submit: () => {
        submit()
      },
    }))

    return (
      <form
        ref={ref}
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <RegionControlsWrapper>
          {/* eslint-disable-next-line jsx-a11y/label-has-for,jsx-a11y/label-has-associated-control */}
          <label htmlFor="zoom-region-start">
            Start
            {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
            <Input
              id="zoom-region-start"
              type="number"
              aria-invalid={!isStartPositionValid}
              aria-describedby={
                isStartPositionValid ? undefined : '#zoom-region-start-validation-error'
              }
              min={regionViewerRegions[0].start}
              max={regionViewerRegions[regionViewerRegions.length - 1].stop}
              pattern="[0-9]*"
              required
              value={zoomRegion.start}
              onChange={(e: any) => {
                const newStart = Number(e.target.value)
                setZoomRegion((prevZoomRegion: any) => ({
                  ...prevZoomRegion,
                  start: newStart,
                }))
              }}
            />
          </label>
          {/* eslint-disable-next-line jsx-a11y/label-has-for,jsx-a11y/label-has-associated-control */}
          <label htmlFor="zoom-region-stop">
            Stop
            {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
            <Input
              id="zoom-region-stop"
              type="number"
              aria-invalid={!isStopPositionValid}
              aria-describedby={
                isStopPositionValid ? undefined : '#zoom-region-stop-validation-error'
              }
              min={regionViewerRegions[0].start}
              max={regionViewerRegions[regionViewerRegions.length - 1].stop}
              pattern="[0-9]*"
              required
              value={zoomRegion.stop}
              onChange={(e: any) => {
                const newStop = Number(e.target.value)
                setZoomRegion((prevZoomRegion: any) => ({
                  ...prevZoomRegion,
                  stop: newStop,
                }))
              }}
            />
          </label>
        </RegionControlsWrapper>
        <p style={{ textAlign: 'center' }}>Total region size: {size.toLocaleString()} bases</p>

        {!isStartPositionValid && (
          <p id="zoom-region-start-validation-error" style={{ textAlign: 'center' }}>
            {startPositionValidationError}
          </p>
        )}
        {!isStopPositionValid && (
          <p id="zoom-region-stop-validation-error" style={{ textAlign: 'center' }}>
            {stopPositionValidationError}
          </p>
        )}

        <div style={{ textAlign: 'center' }}>
          <Button
            onClick={() => {
              setZoomRegion({
                start: regionViewerRegions[0].start,
                stop: regionViewerRegions[regionViewerRegions.length - 1].stop,
              })
            }}
          >
            Reset to full region
          </Button>
        </div>

        {/* Having a submit input enables pressing enter to submit the form */}
        <input type="submit" disabled={!isValid} style={{ display: 'none' }} value="Submit" />

        <div style={{ marginTop: '1em' }}>
          <ZoomRegionOverview
            ref={overviewRef}
            readOnly={false}
            regions={regionViewerRegions}
            renderOverview={renderOverview}
            zoomRegion={zoomRegion}
            onChangeZoomRegion={setZoomRegion}
          />
        </div>
      </form>
    )
  }
)

ZoomRegionForm.defaultProps = {
  // @ts-expect-error TS(2322) FIXME: Type 'null' is not assignable to type '{ start: nu... Remove this comment to see the full error message
  defaultZoomRegion: null,
}

export default ZoomRegionForm
