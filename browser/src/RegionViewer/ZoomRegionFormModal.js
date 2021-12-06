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
  }).isRequired,
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

export default ZoomRegionFormModal
