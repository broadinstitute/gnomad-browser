import React from 'react'

import { BaseTable } from '@gnomad/ui'

import { renderRoundedNumber } from './constraintMetrics'

type Props = {
  constraint: {
    exp_syn: number
    obs_syn: number
    syn_z: number
    exp_mis: number
    obs_mis: number
    mis_z: number
    exp_lof: number
    obs_lof: number
    pLI: number
  }
}

const ExacConstraintTable = ({ constraint }: Props) => (
  // @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
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
            // @ts-expect-error TS(2322) FIXME: Type 'string | null' is not assignable to type 'nu... Remove this comment to see the full error message
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
            // @ts-expect-error TS(2322) FIXME: Type 'string | null' is not assignable to type 'nu... Remove this comment to see the full error message
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
            // @ts-expect-error TS(2322) FIXME: Type 'string | null' is not assignable to type 'nu... Remove this comment to see the full error message
            highlightColor: constraint.pLI > 0.9 ? '#ff9300' : null,
          })}
        </td>
      </tr>
    </tbody>
  </BaseTable>
)

export default ExacConstraintTable
