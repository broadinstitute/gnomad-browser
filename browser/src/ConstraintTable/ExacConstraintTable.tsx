import React from 'react'

import { BaseTable } from '@gnomad/ui'

import { renderRoundedNumber } from './constraintMetrics'

export type ExacConstraint = {
  exp_syn: number | null
  obs_syn: number | null
  syn_z: number | null
  exp_mis: number | null
  obs_mis: number | null
  mis_z: number | null
  exp_lof: number | null
  obs_lof: number | null
  pLI: number
}

type Props = {
  constraint: ExacConstraint
}

const ExacConstraintTable = ({ constraint }: Props) => (
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
            highlightColor: constraint.syn_z && constraint.syn_z > 3.71 ? '#ff2600' : null,
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
            highlightColor: constraint.mis_z && constraint.mis_z > 3.09 ? '#ff9300' : null,
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

export default ExacConstraintTable
