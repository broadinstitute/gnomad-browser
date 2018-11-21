import PropTypes from 'prop-types'
import React from 'react'

import { BaseTable } from '@broad/ui'

import { Query } from '../Query'
import StatusMessage from '../StatusMessage'

const Table = BaseTable.extend`
  @media (max-width: 600px) {
    td,
    th {
      padding-right: 10px;

      /* Drop sparkline column */
      &:nth-child(6) {
        display: none;
      }
    }
  }
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

const pointColor = obsExp => {
  if (obsExp > 0.6) {
    return '#e2e2e2'
  }
  // http://colorbrewer2.org/#type=sequential&scheme=YlOrRd&n=3
  if (obsExp > 0.4) {
    return '#ffeda0'
  }
  if (obsExp > 0.2) {
    return '#feb24c'
  }
  return '#f03b20'
}

const Graph = ({ value, lower, upper }) => {
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
        <circle cx={x(value)} cy={y} r={3} strokeWidth={1} stroke="#000" fill={pointColor(value)} />
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
}

const renderNumber = (num, precision) => (num === null ? '—' : num.toFixed(precision))

const renderOECell = (constraintData, category, style) => {
  const value = constraintData[`oe_${category}`]
  const lower = constraintData[`oe_${category}_lower`]
  const upper = constraintData[`oe_${category}_upper`]

  return (
    <td>
      <span style={style}>o/e = {value === null ? '—' : value.toFixed(2)}</span>
      <br />
      {lower !== null && upper !== null && `(${lower.toFixed(2)} - ${upper.toFixed(2)})`}
    </td>
  )
}

const renderOEGraphCell = (constraintData, category) => {
  const value = constraintData[`oe_${category}`]
  const lower = constraintData[`oe_${category}_lower`]
  const upper = constraintData[`oe_${category}_upper`]

  return (
    <td>
      {value !== null &&
        lower !== null &&
        upper !== null && <Graph lower={lower} upper={upper} value={value} />}
    </td>
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

      const lofMetricStyle =
        constraintData.oe_lof_upper !== null && constraintData.oe_lof_upper < 0.35
          ? { color: '#ff583f' }
          : {}

      return (
        <Table>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Exp. no. variants</th>
              <th scope="col">Obs. no. variants</th>
              <th colSpan={2} scope="col">
                Constraint metrics
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Synonymous</th>
              <td>{renderNumber(constraintData.exp_syn, 1)}</td>
              <td>{renderNumber(constraintData.obs_syn, 0)}</td>
              <td>Z = {renderNumber(constraintData.syn_z, 2)}</td>
              {renderOECell(constraintData, 'syn')}
              {renderOEGraphCell(constraintData, 'syn')}
            </tr>
            <tr>
              <th scope="row">Missense</th>
              <td>{renderNumber(constraintData.exp_mis, 1)}</td>
              <td>{renderNumber(constraintData.obs_mis, 0)}</td>
              <td>Z = {renderNumber(constraintData.mis_z, 2)}</td>
              {renderOECell(constraintData, 'mis')}
              {renderOEGraphCell(constraintData, 'mis')}
            </tr>
            <tr>
              <th scope="row">LoF</th>
              <td>{renderNumber(constraintData.exp_lof, 1)}</td>
              <td>{renderNumber(constraintData.obs_lof, 0)}</td>
              <td>pLI = {renderNumber(constraintData.pLI, 2)}</td>
              {renderOECell(constraintData, 'lof', lofMetricStyle)}
              {renderOEGraphCell(constraintData, 'lof')}
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
