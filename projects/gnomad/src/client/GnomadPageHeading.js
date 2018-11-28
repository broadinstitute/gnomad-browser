import PropTypes from 'prop-types'
import queryString from 'query-string'
import React from 'react'
import { withRouter } from 'react-router-dom'

import { QuestionMark } from '@broad/help'
import { Combobox, PageHeading } from '@broad/ui'

import datasetLabels from './datasetLabels'

const GnomadPageHeading = withRouter(({ children, datasetOptions, history, selectedDataset }) => (
  <PageHeading
    renderPageControls={() => (
      <div>
        {/* eslint-disable-next-line jsx-a11y/label-has-for,jsx-a11y/label-has-associated-control */}
        <label htmlFor="dataset-selector">Current Dataset </label>
        <Combobox
          id="dataset-selector"
          // FIXME
          // Using key forces a re-render when dataset changes
          // Otherwise, the menu doesn't update when the dataset is changed with
          // the browser's forward/back buttons.
          // This is likely a bug in Combobox.
          key={selectedDataset}
          options={datasetOptions.map(datasetId => ({
            datasetId,
            label: datasetLabels[datasetId],
          }))}
          value={datasetLabels[selectedDataset]}
          width="220px"
          onSelect={({ datasetId }) => {
            const nextLocation = Object.assign(history.location, {
              search: queryString.stringify({ dataset: datasetId }),
            })
            history.push(nextLocation)
          }}
        />

        <QuestionMark topic="dataset-selection" display="inline" />
      </div>
    )}
  >
    {children}
  </PageHeading>
))

GnomadPageHeading.propTypes = {
  children: PropTypes.node.isRequired,
  datasetOptions: PropTypes.arrayOf(PropTypes.string),
  selectedDataset: PropTypes.string.isRequired,
}

GnomadPageHeading.defaultProps = {
  datasetOptions: [
    'gnomad_r2_1',
    'gnomad_r2_1_controls',
    'gnomad_r2_1_non_cancer',
    'gnomad_r2_1_non_neuro',
    'gnomad_r2_1_non_topmed',
    'exac',
  ],
}

export default GnomadPageHeading
