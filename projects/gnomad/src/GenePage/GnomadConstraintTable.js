import React from 'react'

import { Table, TableCell, TableHeader, TableRow as UITableRow, TableRows } from '@broad/ui'

import { Query } from '../Query'
import StatusMessage from '../StatusMessage'

const TableRow = UITableRow.extend`
  height: 35px;
`

const ConstraintTable = Table.extend`
  ${TableCell} {
    &:nth-child(1) {
      width: 25%;
    }
    &:nth-child(2),
    &:nth-child(3) {
      width: 17.5%;
    }
    &:nth-child(4) {
      width: 22%;
    }
    &:nth-child(5) {
      width: 18%;
    }

    @media (max-width: 900px) {
      &:nth-child(1) {
        width: 30%;
      }
      &:nth-child(2),
      &:nth-child(3) {
        width: 20%;
      }
      &:nth-child(4) {
        width: 30%;
      }
      &:nth-child(5) {
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
        oe_syn
        lof_z
        mis_z
        syn_z
        gene_issues
        pLI
        pNull
        pRec
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

const Graph = ({ width, value }) => {
  const height = 16
  const xPadding = 10

  return (
    <svg height={height} width={width}>
      <text x={0} y={12} fontSize="12px" textAnchor="start">
        0
      </text>
      <line x1={xPadding} y1={height / 2} x2={width - xPadding} y2={height / 2} stroke="#333" />
      <circle
        cx={value * (width - xPadding * 2) + xPadding}
        cy={height / 2}
        r={3}
        strokeWidth={0.5}
        stroke="#333"
        fill={pointColor(value)}
      />
      <text x={width} y={12} fontSize="12px" textAnchor="end">
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

      const constraintData = data.transcript.gnomad_constraint

      const lofMetricStyle = constraintData.oe_lof_upper < 0.35 ? { color: '#ff583f' } : {}

      return (
        <ConstraintTable>
          <TableRows>
            <TableHeader>
              <TableCell width={'25%'}>Category</TableCell>
              <TableCell width={'17.5%'}>Exp. no. variants</TableCell>
              <TableCell width={'17.5%'}>Obs. no. variants</TableCell>
              <TableCell width={'22%'}>Constraint metric</TableCell>
              <TableCell width={'18%'} />
            </TableHeader>
            <TableRow>
              <TableCell width={'25%'}>Synonymous</TableCell>
              <TableCell width={'17.5%'}>{constraintData.exp_syn.toFixed(1)}</TableCell>
              <TableCell width={'17.5%'}>{constraintData.obs_syn}</TableCell>
              <TableCell width={'22%'}>Z = {constraintData.syn_z.toFixed(2)}</TableCell>
              <TableCell width={'18%'} />
            </TableRow>
            <TableRow>
              <TableCell width={'25%'}>Missense</TableCell>
              <TableCell width={'17.5%'}>{constraintData.exp_mis.toFixed(1)}</TableCell>
              <TableCell width={'17.5%'}>{constraintData.obs_mis}</TableCell>
              <TableCell width={'22%'}>Z = {constraintData.mis_z.toFixed(2)}</TableCell>
              <TableCell width={'18%'} />
            </TableRow>
            <TableRow>
              <TableCell width={'25%'}>LoF</TableCell>
              <TableCell width={'17.5%'}>{constraintData.exp_lof.toFixed(1)}</TableCell>
              <TableCell width={'17.5%'}>{constraintData.obs_lof}</TableCell>
              <TableCell width={'22%'}>
                <span style={lofMetricStyle}>o/e = {constraintData.oe_lof.toFixed(2)}</span>
                <br /> ({constraintData.oe_lof_lower.toFixed(2)} -{' '}
                {constraintData.oe_lof_upper.toFixed(2)})
              </TableCell>
              <TableCell width={'18%'}>
                <Graph value={constraintData.oe_lof} width={55} />
              </TableCell>
            </TableRow>
          </TableRows>
        </ConstraintTable>
      )
    }}
  </Query>
)

export default GnomadConstraintTable
