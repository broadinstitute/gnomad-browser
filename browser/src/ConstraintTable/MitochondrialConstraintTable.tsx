import React from 'react'
import {
  MitochondrialGeneConstraint,
  ProteinMitochondrialGeneConstraint,
  RNAMitochondrialGeneConstraint,
  GeneTranscript,
} from '../GenePage/GenePage'
import { BaseTable, TooltipAnchor } from '@gnomad/ui'
import Link from '../Link'
import { ConstraintHighlight } from './constraintMetrics'

const isProteinMitochondrialGeneConstraint = (
  constraint: MitochondrialGeneConstraint
): constraint is ProteinMitochondrialGeneConstraint =>
  Object.prototype.hasOwnProperty.call(constraint, 'exp_lof')

type Highlight = {
  threshold: number
  color: string
}

type ConstraintRowProps = {
  category: string
  expected: number
  observed: number
  oe: number
  oeLower: number
  oeUpper: number
  highlight?: Highlight
}

const PROTEIN_GENE_HIGHLIGHT: Highlight = {
  threshold: 0.058,
  color: '#ff2600',
}

const RNA_GENE_HIGHLIGHT: Highlight = {
  threshold: 0.27,
  color: PROTEIN_GENE_HIGHLIGHT.color,
}

const ConstraintRow = ({
  category,
  expected,
  observed,
  oe,
  oeLower,
  oeUpper,
  highlight,
}: ConstraintRowProps) => {
  const oeUpperFixed = oeUpper.toFixed(2)
  const oeUpperContent =
    highlight && oeUpper < highlight.threshold ? (
      <ConstraintHighlight highlightColor={highlight.color}>{oeUpperFixed}</ConstraintHighlight>
    ) : (
      oeUpperFixed
    )

  return (
    <tr>
      <th scope="row">{category}</th>
      <td>{expected < 10 ? expected.toFixed(2) : expected.toFixed(1)}</td>
      <td>{observed < 10 ? observed.toFixed(2) : observed.toFixed(1)}</td>
      <td>
        o/e = {oe.toFixed(2)} ({oeLower.toFixed(2)} - {oeUpperContent})
      </td>
    </tr>
  )
}

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
        highlight={PROTEIN_GENE_HIGHLIGHT}
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
        highlight={RNA_GENE_HIGHLIGHT}
      />
    </tbody>
  )
}

const MitochondrialConstraintTable = ({
  constraint,
  transcript,
}: {
  constraint: MitochondrialGeneConstraint | null
  transcript: GeneTranscript | null
}) => {
  if (constraint === null) {
    return <p>Constraint is not available on this gene</p>
  }

  return (
    <>
      {/* @ts-expect-error */}
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
        </thead>
        {isProteinMitochondrialGeneConstraint(constraint) ? (
          <ProteinConstraintMetrics constraint={constraint} />
        ) : (
          <RNAConstraintMetrics constraint={constraint} />
        )}
      </BaseTable>
      {transcript !== null && (
        <>
          Constraint metrics based on transcript{' '}
          <Link to={`/transcript/${transcript.transcript_id}`}>
            {transcript.transcript_id}.{transcript.transcript_version}
          </Link>
        </>
      )}
    </>
  )
}

export default MitochondrialConstraintTable
