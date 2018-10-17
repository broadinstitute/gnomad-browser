import React from 'react'
import styled from 'styled-components'

import { Query } from '../Query'
import StatusMessage from '../StatusMessage'

const Table = styled.table`
  border-collapse: collapse;
  border-spacing: 0;

  td,
  th {
    padding: 0.5em 20px 0.5em 0;
    text-align: left;
  }

  thead {
    th {
      border-bottom: 1px solid #000;
      background-position: center right;
      background-repeat: no-repeat;
    }
  }

  tbody {
    td,
    th {
      border-bottom: 1px solid #ccc;
      font-weight: normal;
    }
  }

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

      const lofMetricStyle = constraintData.oe_lof_upper < 0.35 ? { color: '#ff583f' } : {}

      return (
        <Table>
          <thead>
            <tr>
              <th role="columnheader">Category</th>
              <th role="columnheader">Exp. no. variants</th>
              <th role="columnheader">Obs. no. variants</th>
              <th colSpan={2} role="columnheader">
                Constraint metrics
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr>
              <th role="rowheader">Synonymous</th>
              <td>{constraintData.exp_syn.toFixed(1)}</td>
              <td>{constraintData.obs_syn}</td>
              <td>Z = {constraintData.syn_z.toFixed(2)}</td>
              <td>
                o/e = {constraintData.oe_syn.toFixed(2)}
                <br /> ({constraintData.oe_syn_lower.toFixed(2)} -{' '}
                {constraintData.oe_syn_upper.toFixed(2)})
              </td>
              <td>
                <Graph
                  lower={constraintData.oe_syn_lower}
                  upper={constraintData.oe_syn_upper}
                  value={constraintData.oe_syn}
                />
              </td>
            </tr>
            <tr>
              <th role="rowheader">Missense</th>
              <td>{constraintData.exp_mis.toFixed(1)}</td>
              <td>{constraintData.obs_mis}</td>
              <td>Z = {constraintData.mis_z.toFixed(2)}</td>
              <td>
                o/e = {constraintData.oe_mis.toFixed(2)}
                <br /> ({constraintData.oe_mis_lower.toFixed(2)} -{' '}
                {constraintData.oe_mis_upper.toFixed(2)})
              </td>
              <td>
                <Graph
                  lower={constraintData.oe_mis_lower}
                  upper={constraintData.oe_mis_upper}
                  value={constraintData.oe_mis}
                />
              </td>
            </tr>
            <tr>
              <th role="rowheader">LoF</th>
              <td>{constraintData.exp_lof.toFixed(1)}</td>
              <td>{constraintData.obs_lof}</td>
              <td>pLI = {constraintData.pLI.toFixed(2)}</td>
              <td>
                <span style={lofMetricStyle}>o/e = {constraintData.oe_lof.toFixed(2)}</span>
                <br /> ({constraintData.oe_lof_lower.toFixed(2)} -{' '}
                {constraintData.oe_lof_upper.toFixed(2)})
              </td>
              <td>
                <Graph
                  lower={constraintData.oe_lof_lower}
                  upper={constraintData.oe_lof_upper}
                  value={constraintData.oe_lof}
                />
              </td>
            </tr>
          </tbody>
        </Table>
      )
    }}
  </Query>
)

export default GnomadConstraintTable
