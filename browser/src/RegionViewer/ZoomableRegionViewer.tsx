import React, { useMemo, useRef, useState } from 'react'
import styled from 'styled-components'

import { Button } from '@gnomad/ui'

import getVisibleRegions from './getVisibleRegions'
import RegionViewer from './RegionViewer'
import ZoomRegionFormModal from './ZoomRegionFormModal'
import ZoomRegionOverview from './ZoomRegionOverview'

const ZoomControlsWrapper = styled.div`
  /* Subtract 10px to offset the bottom margin on RegionViewer in ZoomRegionOverview */
  padding: 1em 1em calc(1em - 10px) 1em;
  border: 1px solid #333;
  border-radius: 0.5em;
  margin-bottom: 1em;
  background: #f4f4f4;
`

type OwnProps = {
  contextType?: 'gene' | 'transcript' | 'region'
  regions: {
    start: number
    stop: number
  }[]
  renderOverview: (...args: any[]) => any
  zoomDisabled?: boolean
  zoomRegion?: {
    start: number
    stop: number
  }
  onChangeZoomRegion?: (...args: any[]) => any
}

// @ts-expect-error TS(2456) FIXME: Type alias 'Props' circularly references itself.
type Props = OwnProps & typeof ZoomableRegionViewer.defaultProps

// @ts-expect-error TS(7022) FIXME: 'ZoomableRegionViewer' implicitly has type 'any' b... Remove this comment to see the full error message
const ZoomableRegionViewer = ({
  contextType,
  regions,
  renderOverview,
  zoomDisabled,
  zoomRegion,
  onChangeZoomRegion,
  ...otherProps
}: Props) => {
  const overviewRef = useRef(null)

  const visibleRegions = useMemo(() => getVisibleRegions(regions, zoomRegion), [
    regions,
    zoomRegion,
  ])

  const isZoomed =
    zoomRegion &&
    (zoomRegion.start > regions[0].start || zoomRegion.stop < regions[regions.length - 1].stop)

  const [isSelectRegionModalOpen, setIsSelectRegionModalOpen] = useState(false)

  return (
    <>
      {!zoomDisabled &&
        (isZoomed ? (
          <ZoomControlsWrapper>
            <div style={{ marginBottom: '0.25em' }}>
              Zoomed in on regions between positions {zoomRegion.start.toLocaleString()} and{' '}
              {zoomRegion.stop.toLocaleString()}.{' '}
              <Button
                onClick={() => {
                  setIsSelectRegionModalOpen(true)
                }}
              >
                Select different regions
              </Button>{' '}
              <Button
                onClick={() => {
                  onChangeZoomRegion(null)
                }}
              >
                View full {contextType}
              </Button>
            </div>

            <ZoomRegionOverview
              ref={overviewRef}
              readOnly={false}
              regions={regions}
              renderOverview={renderOverview}
              zoomRegion={zoomRegion}
              onChangeZoomRegion={onChangeZoomRegion}
              onChangeZoomRegionDebounceDelay={150}
            />
          </ZoomControlsWrapper>
        ) : (
          <>
            Viewing full {contextType}.{' '}
            <Button
              onClick={() => {
                setIsSelectRegionModalOpen(true)
              }}
            >
              Zoom in
            </Button>
          </>
        ))}

      <RegionViewer {...otherProps} regions={visibleRegions} />

      {isSelectRegionModalOpen && (
        <ZoomRegionFormModal
          defaultZoomRegion={zoomRegion}
          regionViewerRegions={regions}
          renderOverview={renderOverview}
          onRequestClose={() => {
            setIsSelectRegionModalOpen(false)
          }}
          onSubmitForm={(newZoomRegion: any) => {
            if (overviewRef.current) {
              ;(overviewRef.current as any).setZoomRegion(newZoomRegion)
            }
            onChangeZoomRegion(newZoomRegion)
          }}
        />
      )}
    </>
  )
}

ZoomableRegionViewer.defaultProps = {
  contextType: 'region',
  zoomDisabled: false,
  zoomRegion: null,
  onChangeZoomRegion: () => {},
}

export default ZoomableRegionViewer
