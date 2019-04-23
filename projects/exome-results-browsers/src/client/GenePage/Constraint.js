import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { BaseTable } from '@broad/ui'

const renderNumber = (num, precision = 1) =>
  num === null ? '—' : Number(num.toFixed(precision)).toString()

const Table = styled(BaseTable)`
  td {
    white-space: nowrap;
  }
`

export const ExacConstraintTable = ({ constraint }) => (
  <Table>
    <thead>
      <tr>
        <th scope="col">Category</th>
        <th scope="col">Exp. SNVs</th>
        <th scope="col">Obs. SNVs</th>
        <th scope="col">Constraint metrics</th>
        <th />
      </tr>
    </thead>
    <tbody>
      <tr>
        <th scope="row">Synonymous</th>
        <td>{renderNumber(constraint.exp_syn)}</td>
        <td>{constraint.n_syn === null ? '—' : constraint.n_syn}</td>
        <td>Z = {renderNumber(constraint.syn_z, 2)}</td>
      </tr>
      <tr>
        <th scope="row">Missense</th>
        <td>{renderNumber(constraint.exp_mis)}</td>
        <td>{constraint.n_mis === null ? '—' : constraint.n_mis}</td>
        <td>Z = {renderNumber(constraint.mis_z, 2)}</td>
      </tr>
      <tr>
        <th scope="row">LoF</th>
        <td>{renderNumber(constraint.exp_lof)}</td>
        <td>{constraint.n_lof === null ? '—' : constraint.n_lof}</td>
        <td>pLI = {renderNumber(constraint.pLI, 2, 3)}</td>
      </tr>
    </tbody>
  </Table>
)

ExacConstraintTable.propTypes = {
  constraint: PropTypes.shape({
    exp_lof: PropTypes.number,
    exp_mis: PropTypes.number,
    exp_syn: PropTypes.number,
    n_lof: PropTypes.number,
    n_mis: PropTypes.number,
    n_syn: PropTypes.number,
    lof_z: PropTypes.number,
    mis_z: PropTypes.number,
    syn_z: PropTypes.number,
    pLI: PropTypes.number,
  }).isRequired,
}

export const GnomadConstraintTable = ({ constraint }) => (
  <Table>
    <thead>
      <tr>
        <th scope="col">Category</th>
        <th scope="col">Exp. SNVs</th>
        <th scope="col">Obs. SNVs</th>
        <th colSpan={2} scope="col">
          Constraint metrics
        </th>
        <th />
      </tr>
    </thead>
    <tbody>
      <tr>
        <th scope="row">Synonymous</th>
        <td>{renderNumber(constraint.exp_syn)}</td>
        <td>{constraint.obs_syn === null ? '—' : constraint.obs_syn}</td>
        <td>Z = {renderNumber(constraint.syn_z, 2)}</td>
        <td>o/e = {renderNumber(constraint.oe_syn, 2)}</td>
      </tr>
      <tr>
        <th scope="row">Missense</th>
        <td>{renderNumber(constraint.exp_mis)}</td>
        <td>{constraint.obs_mis === null ? '—' : constraint.obs_mis}</td>
        <td>Z = {renderNumber(constraint.mis_z, 2)}</td>
        <td>o/e = {renderNumber(constraint.oe_mis, 2)}</td>
      </tr>
      <tr>
        <th scope="row">LoF</th>
        <td>{renderNumber(constraint.exp_lof)}</td>
        <td>{constraint.obs_lof === null ? '—' : constraint.obs_lof}</td>
        <td>pLI = {renderNumber(constraint.pLI, 2, 3)}</td>
        <td>o/e = {renderNumber(constraint.oe_lof, 2)}</td>
      </tr>
    </tbody>
  </Table>
)

GnomadConstraintTable.propTypes = {
  constraint: PropTypes.shape({
    exp_lof: PropTypes.number,
    exp_mis: PropTypes.number,
    exp_syn: PropTypes.number,
    obs_lof: PropTypes.number,
    obs_mis: PropTypes.number,
    obs_syn: PropTypes.number,
    oe_lof: PropTypes.number,
    oe_mis: PropTypes.number,
    oe_syn: PropTypes.number,
    lof_z: PropTypes.number,
    mis_z: PropTypes.number,
    syn_z: PropTypes.number,
    pLI: PropTypes.number,
  }).isRequired,
}
