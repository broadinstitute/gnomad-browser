import React from 'react'
import {
  MitochondrialGeneConstraint,
  ProteinMitochondrialGeneConstraint,
  RNAMitochondrialGeneConstraint,
} from '../GenePage/GenePage'
import { BaseTable, TooltipAnchor } from '@gnomad/ui'

const isProteinMitochondrialGeneConstraint = (
  constraint: MitochondrialGeneConstraint
): constraint is ProteinMitochondrialGeneConstraint =>
  Object.prototype.hasOwnProperty.call(constraint, 'exp_lof')

const ConstraintRow = ({
  category,
  expected,
  observed,
  oe,
  oeLower,
  oeUpper,
}: {
  category: string
  expected: number
  observed: number
  oe: number
  oeLower: number
  oeUpper: number
}) => (
  <tr>
    <th scope="row">{category}</th>
    <td>{expected < 10 ? expected.toFixed(2) : expected.toFixed(1)}</td>
    <td>{observed < 10 ? observed.toFixed(2) : observed.toFixed(1)}</td>
    <td>
      o/e = {oe.toFixed(2)} ({oeLower.toFixed(2)} - {oeUpper.toFixed(2)})
    </td>
  </tr>
)

const ProteinConstraintMetrics = ({
  constraint,
}: {
  constraint: ProteinMitochondrialGeneConstraint
}) => {
  const {
    exp_lof,
    exp_mis,
    exp_syn,
    obs_lof,
    obs_mis,
    obs_syn,
    oe_lof,
    oe_lof_lower,
    oe_lof_upper,
    oe_mis,
    oe_mis_lower,
    oe_mis_upper,
    oe_syn,
    oe_syn_lower,
    oe_syn_upper,
  } = constraint
  return (
    <tbody>
      <ConstraintRow
        category="Synonymous"
        expected={exp_syn}
        observed={obs_syn}
        oe={oe_syn}
        oeLower={oe_syn_lower}
        oeUpper={oe_syn_upper}
      />
      <ConstraintRow
        category="Missense"
        expected={exp_mis}
        observed={obs_mis}
        oe={oe_mis}
        oeLower={oe_mis_lower}
        oeUpper={oe_mis_upper}
      />
      <ConstraintRow
        category="pLoF"
        expected={exp_lof}
        observed={obs_lof}
        oe={oe_lof}
        oeLower={oe_lof_lower}
        oeUpper={oe_lof_upper}
      />
    </tbody>
  )
}

const RNAConstraintMetrics = ({ constraint }: { constraint: RNAMitochondrialGeneConstraint }) => {
  const { expected, observed, oe, oe_lower, oe_upper } = constraint
  return (
    <tbody>
      <ConstraintRow
        category="RNA variant"
        expected={expected}
        observed={observed}
        oe={oe}
        oeLower={oe_lower}
        oeUpper={oe_upper}
      />
    </tbody>
  )
}

const MitochondrialConstraintTable = ({
  constraint,
}: {
  constraint: MitochondrialGeneConstraint | null
}) => {
  if (constraint === null) {
    return <p>Constraint is not available on this gene</p>
  }

  return (
    // @ts-expect-error
    <BaseTable>
      <thead>
        <tr>
          <th scope="col">Category</th>
          <th scope="col">
            {' '}
            <>
              {/* @ts-expect-error */}
              <TooltipAnchor tooltip="Sum of maximum heteroplasmy of expected SNVs in gene">
                <span>Expected</span>
              </TooltipAnchor>
            </>
          </th>
          <th scope="col">
            <>
              {/* @ts-expect-error */}
              <TooltipAnchor tooltip="Sum of maximum heteroplasmy of observed SNVs in gene">
                <span>Observed</span>
              </TooltipAnchor>
            </>
          </th>
          <th scope="col">Constraint metrics</th>
        </tr>
      </thead>{' '}
      {isProteinMitochondrialGeneConstraint(constraint) ? (
        <ProteinConstraintMetrics constraint={constraint} />
      ) : (
        <RNAConstraintMetrics constraint={constraint} />
      )}
    </BaseTable>
  )
}

export default MitochondrialConstraintTable
