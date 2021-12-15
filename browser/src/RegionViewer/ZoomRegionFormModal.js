import PropTypes from 'prop-types'
import React, { useRef } from 'react'

import { Button, Modal, PrimaryButton } from '@gnomad/ui'

import ZoomRegionForm from './ZoomRegionForm'

const ZoomRegionFormModal = ({
  defaultZoomRegion,
  regionViewerRegions,
  renderOverview,
  onRequestClose,
  onSubmitForm,
}) => {
  const formRef = useRef(null)

  return (
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
                formRef.current.submit()
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
        onSubmit={value => {
          onRequestClose()
          onSubmitForm(value)
        }}
      />
    </Modal>
  )
}

ZoomRegionFormModal.propTypes = {
  defaultZoomRegion: PropTypes.shape({
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }),
  regionViewerRegions: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
    })
  ).isRequired,
  renderOverview: PropTypes.func.isRequired,
  onRequestClose: PropTypes.func.isRequired,
  onSubmitForm: PropTypes.func.isRequired,
}

ZoomRegionFormModal.defaultProps = {
  defaultZoomRegion: null,
}

export default ZoomRegionFormModal
