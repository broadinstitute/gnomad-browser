import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { BaseTable, TooltipAnchor, TooltipHint } from '@broad/ui'

import { Query } from '../Query'
import StatusMessage from '../StatusMessage'

const ConstraintHighlight = styled.span`
  display: inline-block;
  padding: 0.25em 0.4em;
  border: 1px solid #000;
  border-radius: 0.3em;
  background: ${props => props.highlightColor};
  color: #000;
`

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

const constraintQuery = `
  query GnomadConstraint($transcriptId: String!) {
    transcript(transcript_id: $transcriptId) {
      gnomad_constraint {
        exp_lof
        exp_mis
        exp_syn
        obs_lof
        obs_mis
        obs_syn
        oe_lof
        oe_lof_lower
        oe_lof_upper
        oe_mis
        oe_mis_lower
        oe_mis_upper
        oe_syn
        oe_syn_lower
        oe_syn_upper
        lof_z
        mis_z
        syn_z
        pLI
      }
    }
  }
`

const Graph = ({ value, lower, upper, color }) => {
  const width = 60
  const xPadding = 13

  const x = n => Math.max(0, Math.min(xPadding + n * (width - xPadding * 2), width - xPadding))

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

Graph.propTypes = {
  value: PropTypes.number.isRequired,
  lower: PropTypes.number.isRequired,
  upper: PropTypes.number.isRequired,
  color: PropTypes.string,
}

Graph.defaultProps = {
  color: undefined,
}

export const renderRoundedNumber = (
  num,
  precision = 1,
  tooltipPrecision = 3,
  highlightColor = null
) => {
  if (num === null) {
    return '—'
  }

  const roundedNumber = Number(num.toFixed(precision)).toString()
  return (
    <TooltipAnchor tooltip={num.toFixed(tooltipPrecision)}>
      {highlightColor ? (
        <ConstraintHighlight highlightColor={highlightColor}>{roundedNumber}</ConstraintHighlight>
      ) : (
        <TooltipHint>{roundedNumber}</TooltipHint>
      )}
    </TooltipAnchor>
  )
}

const renderOEMetrics = (constraintData, category, highlightColor) => {
  const value = constraintData[`oe_${category}`]
  const lower = constraintData[`oe_${category}_lower`]
  const upper = constraintData[`oe_${category}_upper`]

  return (
    <OEMetrics>
      o/e = {renderRoundedNumber(value, 2, 3)}
      {lower !== null && upper !== null && (
        <React.Fragment>
          {' '}
          ({renderRoundedNumber(lower, 2, 3)} - {renderRoundedNumber(upper, 2, 3, highlightColor)})
        </React.Fragment>
      )}
    </OEMetrics>
  )
}

const renderOEGraph = (constraintData, category, color) => {
  const value = constraintData[`oe_${category}`]
  const lower = constraintData[`oe_${category}_lower`]
  const upper = constraintData[`oe_${category}_upper`]

  return (
    value !== null &&
    lower !== null &&
    upper !== null && <Graph lower={lower} upper={upper} value={value} color={color} />
  )
}

const GnomadConstraintTable = ({ transcriptId }) => (
  <Query query={constraintQuery} variables={{ transcriptId }}>
    {({ data, error, loading }) => {
      if (loading) {
        return <StatusMessage>Loading constraint...</StatusMessage>
      }
      if (error) {
        return <StatusMessage>Unable to load constraint</StatusMessage>
      }

      if (!data.transcript.gnomad_constraint) {
        return <StatusMessage>No constraint data for this gene</StatusMessage>
      }

      const constraintData = data.transcript.gnomad_constraint

      let lofHighlightColor = null
      if (constraintData.oe_lof_upper !== null) {
        if (constraintData.oe_lof_upper < 0.33) {
          lofHighlightColor = '#ff2600'
        } else if (constraintData.oe_lof_upper < 0.66) {
          lofHighlightColor = '#ff9300'
        } else if (constraintData.oe_lof_upper < 1) {
          lofHighlightColor = '#ffc000'
        }
      }

      return (
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
              <td>{renderRoundedNumber(constraintData.exp_syn)}</td>
              <td>{constraintData.obs_syn === null ? '—' : constraintData.obs_syn}</td>
              <td>
                Z ={' '}
                {renderRoundedNumber(
                  constraintData.syn_z,
                  2,
                  3,
                  constraintData.syn_z > 3.71 && '#ff2600'
                )}
                <br />
                {renderOEMetrics(constraintData, 'syn')}
              </td>
              <td>{renderOEGraph(constraintData, 'syn')}</td>
            </tr>
            <tr>
              <th scope="row">Missense</th>
              <td>{renderRoundedNumber(constraintData.exp_mis)}</td>
              <td>{constraintData.obs_mis === null ? '—' : constraintData.obs_mis}</td>
              <td>
                Z ={' '}
                {renderRoundedNumber(
                  constraintData.mis_z,
                  2,
                  3,
                  constraintData.mis_z > 3.09 && '#ff9300'
                )}
                <br />
                {renderOEMetrics(constraintData, 'mis')}
              </td>
              <td>{renderOEGraph(constraintData, 'mis')}</td>
            </tr>
            <tr>
              <th scope="row">LoF</th>
              <td>{renderRoundedNumber(constraintData.exp_lof)}</td>
              <td>{constraintData.obs_lof === null ? '—' : constraintData.obs_lof}</td>
              <td>
                pLI = {renderRoundedNumber(constraintData.pLI, 2, 3)}
                <br />
                {renderOEMetrics(constraintData, 'lof', lofHighlightColor)}
              </td>
              <td>{renderOEGraph(constraintData, 'lof', lofHighlightColor)}</td>
            </tr>
          </tbody>
        </Table>
      )
    }}
  </Query>
)

GnomadConstraintTable.propTypes = {
  transcriptId: PropTypes.string.isRequired,
}

export default GnomadConstraintTable
