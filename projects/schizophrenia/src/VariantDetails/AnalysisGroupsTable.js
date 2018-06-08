import gql from 'graphql-tag'
import PropTypes from 'prop-types'
import React from 'react'
import { graphql } from 'react-apollo'

import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
  TableRows,
} from '@broad/ui'


export function BaseAnalysisGroupsTable({ groups }) {
  return (
    <Table>
      <TableRows>
        <TableHeader>
          <TableCell width={'200px'}>Group</TableCell>
          <TableCell width={'80px'}>Cases</TableCell>
          <TableCell width={'80px'}>Controls</TableCell>
          <TableCell width={'80px'}>P-value</TableCell>
          <TableCell width={'80px'}>Beta</TableCell>
        </TableHeader>
        {groups.map(group => (
          <TableRow key={group.group}>
            <TableCell width={'200px'}>{group.group}</TableCell>
            <TableCell width={'80px'}>{group.ac_case}</TableCell>
            <TableCell width={'80px'}>{group.ac_ctrl}</TableCell>
            <TableCell width={'80px'}>{group.pval}</TableCell>
            <TableCell width={'80px'}>{group.beta}</TableCell>
          </TableRow>
        ))}
      </TableRows>
    </Table>
  )
}

BaseAnalysisGroupsTable.propTypes = {
  groups: PropTypes.arrayOf(PropTypes.shape({
    group: PropTypes.string.isRequired,
    ac_case: PropTypes.number.isRequired,
    ac_ctrl: PropTypes.number.isRequired,
    pval: PropTypes.number.isRequired,
    beta: PropTypes.number.isRequired,
  })).isRequired,
}


const analysisGroupsQuery = gql`
  query AnalysisGroups(
    $variantId: String,
  ) {
    groups: schzGroups(variant_id: $variantId) {
      pos
      xpos
      pval
      ac_case
      contig
      beta
      variant_id
      an_ctrl
      an_case
      group
      ac_ctrl
      allele_freq
    }
}
`

const ConnectedAnalysisGroupsTable = graphql(
  analysisGroupsQuery,
  {
    options: ({ variantId }) => ({
      variables: { variantId },
      errorPolicy: 'ignore'
    })
  }
)(({ data: { loading, groups } }) => {
  if (loading) {
    return <span>Loading groups...</span>
  }
  return <BaseAnalysisGroupsTable groups={groups} />
})

export default ConnectedAnalysisGroupsTable
