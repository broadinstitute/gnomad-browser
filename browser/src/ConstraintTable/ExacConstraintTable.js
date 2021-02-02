import PropTypes from 'prop-types'
import React from 'react'

import { BaseTable } from '@gnomad/ui'

import { renderRoundedNumber } from './constraintMetrics'

const ExacConstraintTable = ({ constraint }) => (
  <BaseTable>
    <thead>
      <tr>
        <th scope="col">Category</th>
        <th scope="col">Expected SNVs</th>
        <th scope="col">Observed SNVs</th>
        <th scope="col">Constraint metric</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th scope="row">Synonymous</th>
        <td>{renderRoundedNumber(constraint.exp_syn)}</td>
        <td>{constraint.obs_syn}</td>
        <td>
          Z ={' '}
          {renderRoundedNumber(constraint.syn_z, {
            precision: 2,
            tooltipPrecision: 3,
            highlightColor: constraint.syn_z > 3.71 ? '#ff2600' : null,
          })}
        </td>
      </tr>
      <tr>
        <th scope="row">Missense</th>
        <td>{renderRoundedNumber(constraint.exp_mis)}</td>
        <td>{constraint.obs_mis}</td>
        <td>
          Z ={' '}
          {renderRoundedNumber(constraint.mis_z, {
            precision: 2,
            tooltipPrecision: 3,
            highlightColor: constraint.mis_z > 3.09 ? '#ff9300' : null,
          })}
        </td>
      </tr>
      <tr>
        <th scope="row">pLoF</th>
        <td>{renderRoundedNumber(constraint.exp_lof)}</td>
        <td>{constraint.obs_lof}</td>
        <td>
          pLI ={' '}
          {renderRoundedNumber(constraint.pLI, {
            precision: 2,
            tooltipPrecision: 3,
            highlightColor: constraint.pLI > 0.9 ? '#ff9300' : null,
          })}
        </td>
      </tr>
    </tbody>
  </BaseTable>
)

ExacConstraintTable.propTypes = {
  constraint: PropTypes.shape({
    exp_syn: PropTypes.number.isRequired,
    obs_syn: PropTypes.number.isRequired,
    syn_z: PropTypes.number.isRequired,
    exp_mis: PropTypes.number.isRequired,
    obs_mis: PropTypes.number.isRequired,
    mis_z: PropTypes.number.isRequired,
    exp_lof: PropTypes.number.isRequired,
    obs_lof: PropTypes.number.isRequired,
    pLI: PropTypes.number.isRequired,
  }).isRequired,
}

export default ExacConstraintTable
