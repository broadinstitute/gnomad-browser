import PropTypes from 'prop-types'
import React from 'react'

import { BaseTable } from '@broad/ui'

import browserConfig from '@browser/config'

import sortByGroup from '../sortByGroup'
import variantResultColumns from './variantResultColumns'

const formatExponential = number =>
  number === null ? null : Number(number.toPrecision(4)).toExponential()

const renderNumber = (num, precision = 3) =>
  num === null ? null : Number(num.toPrecision(precision)).toString()

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
        {variantResultColumns.map(c => (
          <th key={c.key} scope="col">
            {c.heading}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {sortByGroup(results, browserConfig.variants.groups).map(result => (
        <tr key={result.analysis_group}>
          <th scope="row">
            {browserConfig.variants.groups.labels[result.analysis_group] || result.analysis_group}
          </th>
          <td>{result.ac_case}</td>
          <td>{result.an_case}</td>
          <td>{result.ac_ctrl}</td>
          <td>{result.an_ctrl}</td>
          <td>{formatExponential(result.af_case)}</td>
          <td>{formatExponential(result.af_ctrl)}</td>
          {variantResultColumns.map(c => (
            <td key={c.key}>
              {result[c.key] === null ? '' : (c.render || renderNumber)(result[c.key])}
            </td>
          ))}
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
