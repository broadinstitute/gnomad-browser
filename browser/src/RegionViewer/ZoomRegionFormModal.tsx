import React, { useRef } from 'react'

import { Button, Modal, PrimaryButton } from '@gnomad/ui'

import ZoomRegionForm from './ZoomRegionForm'

type OwnProps = {
  defaultZoomRegion?: {
    start: number
    stop: number
  }
  regionViewerRegions: {
    start: number
    stop: number
  }[]
  renderOverview: (...args: any[]) => any
  onRequestClose: (...args: any[]) => any
  onSubmitForm: (...args: any[]) => any
}

// @ts-expect-error TS(2456) FIXME: Type alias 'Props' circularly references itself.
type Props = OwnProps & typeof ZoomRegionFormModal.defaultProps

// @ts-expect-error TS(7022) FIXME: 'ZoomRegionFormModal' implicitly has type 'any' be... Remove this comment to see the full error message
const ZoomRegionFormModal = ({
  defaultZoomRegion,
  regionViewerRegions,
  renderOverview,
  onRequestClose,
  onSubmitForm,
}: Props) => {
  const formRef = useRef(null)

  return (
    // @ts-expect-error TS(2741) FIXME: Property 'size' is missing in type '{ children: El... Remove this comment to see the full error message
    <Modal
      id="region-viewer-select-zoom-region-modal"
      title="Select regions to zoom in on"
      footer={
        <React.Fragment>
          <Button
            onClick={() => {
              onRequestClose()
            }}
          >
            Cancel
          </Button>
          <PrimaryButton
            onClick={() => {
              if (formRef.current) {
                ;(formRef.current as any).submit()
              }
            }}
            style={{ marginLeft: '1em' }}
          >
            Ok
          </PrimaryButton>
        </React.Fragment>
      }
      onRequestClose={onRequestClose}
    >
      <p>
        All tracks (coverage, transcripts, ClinVar and gnomAD variants, etc.) and the variants table
        will show data only from the selected region.
      </p>
      <ZoomRegionForm
        ref={formRef}
        defaultZoomRegion={defaultZoomRegion}
        regionViewerRegions={regionViewerRegions}
        renderOverview={renderOverview}
        onSubmit={(value) => {
          onRequestClose()
          onSubmitForm(value)
        }}
      />
    </Modal>
  )
}

ZoomRegionFormModal.defaultProps = {
  defaultZoomRegion: null,
}

export default ZoomRegionFormModal
