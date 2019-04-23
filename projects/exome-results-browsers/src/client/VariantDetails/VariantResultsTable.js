import PropTypes from 'prop-types'
import React from 'react'

import { BaseTable } from '@broad/ui'

import browserConfig from '@browser/config'

import sortByGroup from '../sortByGroup'

const formatExponential = number =>
  number === null ? null : Number(number.toPrecision(4)).toExponential()

const VariantResultsTable = ({ results }) => (
  <BaseTable>
    <thead>
      <tr>
        <th scope="col">Group</th>
        <th scope="col">AC Case</th>
        <th scope="col">AN Case</th>
        <th scope="col">AC Ctrl</th>
        <th scope="col">AN Ctrl</th>
        <th scope="col">AF Case</th>
        <th scope="col">AF Ctrl</th>
        <th scope="col">P-value</th>
        <th scope="col">Beta</th>
      </tr>
    </thead>
    <tbody>
      {sortByGroup([...results]).map(result => (
        <tr key={result.analysis_group}>
          <th scope="row">
            {browserConfig.analysisGroups.labels[result.analysis_group] || result.analysis_group}
          </th>
          <td>{result.ac_case}</td>
          <td>{result.an_case}</td>
          <td>{result.ac_ctrl}</td>
          <td>{result.an_ctrl}</td>
          <td>{formatExponential(result.af_case)}</td>
          <td>{formatExponential(result.af_ctrl)}</td>
          <td>{result.p ? result.p.toPrecision(4) : ''}</td>
          <td>{result.se ? result.se.toPrecision(4) : ''}</td>
        </tr>
      ))}
    </tbody>
  </BaseTable>
)

VariantResultsTable.propTypes = {
  results: PropTypes.arrayOf(
    PropTypes.shape({
      analysis_group: PropTypes.string.isRequired,
      ac_case: PropTypes.number.isRequired,
      an_case: PropTypes.number.isRequired,
      af_case: PropTypes.number.isRequired,
      ac_ctrl: PropTypes.number.isRequired,
      an_ctrl: PropTypes.number.isRequired,
      af_ctrl: PropTypes.number.isRequired,
    })
  ).isRequired,
}

export default VariantResultsTable
