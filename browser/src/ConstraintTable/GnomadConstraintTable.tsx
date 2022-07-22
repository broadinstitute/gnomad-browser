import React from 'react'
import styled from 'styled-components'

import { Badge, BaseTable, TooltipAnchor, TooltipHint } from '@gnomad/ui'

import Link from '../Link'
import { renderRoundedNumber } from './constraintMetrics'

const Table = styled(BaseTable)`
  @media (max-width: 600px) {
    td,
    th {
      padding-right: 10px;

      /* Drop sparkline column */
      &:nth-child(5) {
        display: none;
      }
    }
  }
`

const OEMetrics = styled.span`
  display: inline-block;
  margin-top: 0.5em;
  white-space: nowrap;
`

type OwnGraphProps = {
  value: number
  lower: number
  upper: number
  color?: string
}

// @ts-expect-error TS(2456) FIXME: Type alias 'GraphProps' circularly references itse... Remove this comment to see the full error message
type GraphProps = OwnGraphProps & typeof Graph.defaultProps

// @ts-expect-error TS(7022) FIXME: 'Graph' implicitly has type 'any' because it does ... Remove this comment to see the full error message
const Graph = ({ value, lower, upper, color }: GraphProps) => {
  const width = 60
  const xPadding = 13

  const x = (n: any) =>
    Math.max(0, Math.min(xPadding + n * (width - xPadding * 2), width - xPadding))

  const y = 18

  return (
    <svg height={30} width={width}>
      <text x={0} y={26} fontSize="12px" textAnchor="start">
        0
      </text>
      <line x1={xPadding} y1={25} x2={width - xPadding} y2={25} stroke="#333" />

      <rect x={x(lower)} y={y - 7} height={14} width={x(upper) - x(lower)} fill="#aaa" />

      {value >= 1 ? (
        <path d="M 47,14 52,18 47,22 z" fill="#e2e2e2" strokeWidth={1} stroke="#000" />
      ) : (
        <circle
          cx={x(value)}
          cy={y}
          r={3}
          strokeWidth={1}
          stroke="#000"
          fill={color || '#e2e2e2'}
        />
      )}

      <text x={width} y={26} fontSize="12px" textAnchor="end">
        1
      </text>
    </svg>
  )
}

Graph.defaultProps = {
  color: undefined,
}

const renderOEMetrics = (constraint: any, category: any, highlightColor: any) => {
  const value = constraint[`oe_${category}`]
  const lower = constraint[`oe_${category}_lower`]
  const upper = constraint[`oe_${category}_upper`]

  return (
    <OEMetrics>
      o/e = {renderRoundedNumber(value, { precision: 2, tooltipPrecision: 3 })}
      {lower !== null && upper !== null && (
        <React.Fragment>
          {' '}
          ({renderRoundedNumber(lower, { precision: 2, tooltipPrecision: 3 })} -{' '}
          {renderRoundedNumber(upper, {
            precision: 2,
            tooltipPrecision: 3,
            highlightColor,
            formatTooltip: category === 'lof' ? (n) => `LOEUF = ${n}` : (n) => n,
          })}
          )
        </React.Fragment>
      )}
    </OEMetrics>
  )
}

const renderOEGraph = (constraint: any, category: any, color: any) => {
  const value = constraint[`oe_${category}`]
  const lower = constraint[`oe_${category}_lower`]
  const upper = constraint[`oe_${category}_upper`]

  return (
    value !== null &&
    lower !== null &&
    upper !== null && <Graph lower={lower} upper={upper} value={value} color={color} />
  )
}

const CONSTRAINT_FLAG_DESCRIPTIONS = {
  lof_too_many: 'More pLoF variants than expected',
  mis_too_many: 'More missense variants than expected',
  no_exp_lof: 'Zero expected pLoF variants',
  no_exp_mis: 'Zero expected missense variants',
  no_exp_syn: 'Zero expected synonymous variants',
  no_variants: 'Zero observed synonymous, missense, pLoF variants',
  syn_outlier: 'More or fewer synonymous variants than expected',
}

type GnomadConstraintTableProps = {
  constraint: {
    exp_lof?: number
    exp_mis?: number
    exp_syn?: number
    obs_lof?: number
    obs_mis?: number
    obs_syn?: number
    oe_lof?: number
    oe_lof_lower?: number
    oe_lof_upper?: number
    oe_mis?: number
    oe_mis_lower?: number
    oe_mis_upper?: number
    oe_syn?: number
    oe_syn_lower?: number
    oe_syn_upper?: number
    lof_z?: number
    mis_z?: number
    syn_z?: number
    pLI?: number
    flags?: string[]
  }
}

const GnomadConstraintTable = ({ constraint }: GnomadConstraintTableProps) => {
  let lofHighlightColor = null
  if (constraint.oe_lof_upper !== null) {
    // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
    if (constraint.oe_lof_upper < 0.33) {
      lofHighlightColor = '#ff2600'
      // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
    } else if (constraint.oe_lof_upper < 0.66) {
      lofHighlightColor = '#ff9300'
      // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
    } else if (constraint.oe_lof_upper < 1) {
      lofHighlightColor = '#ffc000'
    }
  }

  const constraintFlags = (constraint.flags || []).filter((flag) => !flag.startsWith('no_'))

  return (
    <div>
      <Table>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">
              {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
              <TooltipAnchor tooltip="Expected variant counts were predicted using a depth corrected probability of mutation for each gene. More details can be found in the gnomAD flagship paper. Note that the expected variant counts for bases with a median depth <1 were removed from the totals.">
                {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <TooltipHint>Expected SNVs</TooltipHint>
              </TooltipAnchor>
            </th>
            <th scope="col">
              {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
              <TooltipAnchor tooltip="Includes single nucleotide changes that occurred in the canonical transcript that were found at a frequency of <0.1%, passed all filters, and at sites with a median depth ≥1. The counts represent the number of unique variants and not the allele count of these variants.">
                {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <TooltipHint>Observed SNVs</TooltipHint>
              </TooltipAnchor>
            </th>
            <th scope="col">Constraint metrics</th>
            <td />
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Synonymous</th>
            <td>{renderRoundedNumber(constraint.exp_syn)}</td>
            <td>{constraint.obs_syn === null ? '—' : constraint.obs_syn}</td>
            <td>
              Z ={' '}
              {renderRoundedNumber(constraint.syn_z, {
                precision: 2,
                tooltipPrecision: 3,
                // @ts-expect-error TS(2322) FIXME: Type 'string | null' is not assignable to type 'nu... Remove this comment to see the full error message
                highlightColor: constraint.syn_z > 3.71 ? '#ff2600' : null,
              })}
              <br />
              {/* @ts-expect-error TS(2554) FIXME: Expected 3 arguments, but got 2. */}
              {renderOEMetrics(constraint, 'syn')}
            </td>
            {/* @ts-expect-error TS(2554) FIXME: Expected 3 arguments, but got 2. */}
            <td>{renderOEGraph(constraint, 'syn')}</td>
          </tr>
          <tr>
            <th scope="row">Missense</th>
            <td>{renderRoundedNumber(constraint.exp_mis)}</td>
            <td>{constraint.obs_mis === null ? '—' : constraint.obs_mis}</td>
            <td>
              Z ={' '}
              {renderRoundedNumber(constraint.mis_z, {
                precision: 2,
                tooltipPrecision: 3,
                // @ts-expect-error TS(2322) FIXME: Type 'string | null' is not assignable to type 'nu... Remove this comment to see the full error message
                highlightColor: constraint.mis_z > 3.09 ? '#ff9300' : null,
              })}
              <br />
              {/* @ts-expect-error TS(2554) FIXME: Expected 3 arguments, but got 2. */}
              {renderOEMetrics(constraint, 'mis')}
            </td>
            {/* @ts-expect-error TS(2554) FIXME: Expected 3 arguments, but got 2. */}
            <td>{renderOEGraph(constraint, 'mis')}</td>
          </tr>
          <tr>
            <th scope="row">pLoF</th>
            <td>{renderRoundedNumber(constraint.exp_lof)}</td>
            <td>{constraint.obs_lof === null ? '—' : constraint.obs_lof}</td>
            <td>
              pLI = {renderRoundedNumber(constraint.pLI, { precision: 2, tooltipPrecision: 3 })}
              <br />
              {renderOEMetrics(constraint, 'lof', lofHighlightColor)}
            </td>
            <td>{renderOEGraph(constraint, 'lof', lofHighlightColor)}</td>
          </tr>
        </tbody>
      </Table>
      {constraintFlags.length > 0 && (
        <React.Fragment>
          {constraintFlags.map((flag) => (
            <p key={flag} style={{ maxWidth: '460px' }}>
              {/* @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
              <Badge level="info">Note</Badge> {CONSTRAINT_FLAG_DESCRIPTIONS[flag]}
            </p>
          ))}
          <p>
            <Link
              preserveSelectedDataset={false}
              to="/help/why-are-constraint-metrics-missing-for-this-gene-or-annotated-with-a-note"
            >
              More information on constraint flags.
            </Link>
          </p>
        </React.Fragment>
      )}
    </div>
  )
}

export default GnomadConstraintTable
