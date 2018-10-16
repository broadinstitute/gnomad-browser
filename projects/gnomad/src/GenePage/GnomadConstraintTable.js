import React from 'react'

import { Table, TableCell, TableHeader, TableRow as UITableRow, TableRows } from '@broad/ui'

import { Query } from '../Query'
import StatusMessage from '../StatusMessage'

const TableRow = UITableRow.extend`
  height: 35px;
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
        <Table>
          <TableRows>
            <TableHeader>
              <TableCell width={'25%'}>Category</TableCell>
              <TableCell width={'20%'}>Exp. no. variants</TableCell>
              <TableCell width={'20%'}>Obs. no. variants</TableCell>
              <TableCell width={'35%'}>Constraint metric</TableCell>
            </TableHeader>
            <TableRow>
              <TableCell width={'25%'}>Synonymous</TableCell>
              <TableCell width={'20%'}>{constraintData.exp_syn.toFixed(1)}</TableCell>
              <TableCell width={'20%'}>{constraintData.obs_syn}</TableCell>
              <TableCell width={'35%'}>Z = {constraintData.syn_z.toFixed(2)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell width={'25%'}>Missense</TableCell>
              <TableCell width={'20%'}>{constraintData.exp_mis.toFixed(1)}</TableCell>
              <TableCell width={'20%'}>{constraintData.obs_mis}</TableCell>
              <TableCell width={'35%'}>Z = {constraintData.mis_z.toFixed(2)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell width={'25%'}>LoF</TableCell>
              <TableCell width={'20%'}>{constraintData.exp_lof.toFixed(1)}</TableCell>
              <TableCell width={'20%'}>{constraintData.obs_lof}</TableCell>
              <TableCell width={'35%'}>
                <span style={lofMetricStyle}>o/e = {constraintData.oe_lof.toFixed(2)}</span>
                <br /> ({constraintData.oe_lof_lower.toFixed(2)} - {constraintData.oe_lof_upper.toFixed(2)})
              </TableCell>
            </TableRow>
          </TableRows>
        </Table>
      )
    }}
  </Query>
)

export default GnomadConstraintTable
