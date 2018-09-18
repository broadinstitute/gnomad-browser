import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'

import { QuestionMark } from '@broad/help'
import { actions as variantActions, selectedVariantDataset } from '@broad/redux-variants'
import { Combobox, PageHeading } from '@broad/ui'

const datasetLabels = {
  exacVariants: 'ExAC',
  gnomadCombinedVariants: 'gnomAD',
}

const GnomadPageHeading = connect(
  state => ({ selectedVariantDataset: selectedVariantDataset(state) }),
  dispatch => ({
    setSelectedVariantDataset: dataset =>
      dispatch(variantActions.setSelectedVariantDataset(dataset)),
  })
)(({ children, selectedVariantDataset, setSelectedVariantDataset }) => (
  <PageHeading
    renderPageControls={() => (
      <div>
        {/* eslint-disable jsx-a11y/label-has-for */}
        <label htmlFor="dataset-selector">Current Dataset </label>
        <Combobox
          id="dataset-selector"
          options={['gnomadCombinedVariants', 'exacVariants'].map(datasetId => ({
            label: datasetLabels[datasetId],
            value: datasetId,
          }))}
          value={datasetLabels[selectedVariantDataset]}
          width="100px"
          onChange={setSelectedVariantDataset}
        />

        <QuestionMark topic={'dataset-selection'} display={'inline'} />
      </div>
    )}
  >
    {children}
  </PageHeading>
))

GnomadPageHeading.propTypes = {
  children: PropTypes.node.isRequired,
}

export default GnomadPageHeading
