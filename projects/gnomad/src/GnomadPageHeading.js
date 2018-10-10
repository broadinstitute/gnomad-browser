import PropTypes from 'prop-types'
import queryString from 'query-string'
import React from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'

import { QuestionMark } from '@broad/help'
import { selectedVariantDataset } from '@broad/redux-variants'
import { Combobox, PageHeading } from '@broad/ui'

import datasetLabels from './datasetLabels'

const GnomadPageHeading = withRouter(
  connect(state => ({ selectedVariantDataset: selectedVariantDataset(state) }))(
    ({ children, history, selectedVariantDataset }) => (
      <PageHeading
        renderPageControls={() => (
          <div>
            {/* eslint-disable jsx-a11y/label-has-for */}
            <label htmlFor="dataset-selector">Current Dataset </label>
            <Combobox
              id="dataset-selector"
              // FIXME
              // Using key forces a re-render when dataset changes
              // Otherwise, the menu doesn't update when the dataset is changed with
              // the browser's forward/back buttons.
              // This is likely a bug in Combobox.
              key={selectedVariantDataset}
              options={['gnomad_r2_0_2', 'exac'].map(datasetId => ({
                label: datasetLabels[datasetId],
                value: datasetId,
              }))}
              value={datasetLabels[selectedVariantDataset]}
              width="150px"
              onChange={datasetId => {
                const nextLocation = Object.assign(history.location, {
                  search: queryString.stringify({ dataset: datasetId }),
                })
                history.push(nextLocation)
              }}
            />

            <QuestionMark topic={'dataset-selection'} display={'inline'} />
          </div>
        )}
      >
        {children}
      </PageHeading>
    )
  )
)

GnomadPageHeading.propTypes = {
  children: PropTypes.node.isRequired,
}

export default GnomadPageHeading
