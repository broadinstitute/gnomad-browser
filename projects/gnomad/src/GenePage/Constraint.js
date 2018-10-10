import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'

import { geneData } from '@broad/redux-genes'
import { selectedVariantDataset } from '@broad/redux-variants'
import { Table, TableCell, TableHeader, TableRow, TableRows, TableTitleColumn } from '@broad/ui'

const ConstraintTable = ({ constraintData }) => (
  <Table>
    <TableRows>
      <TableHeader>
        <TableTitleColumn />
        <TableCell width={'40%'}>Category</TableCell>
        <TableCell width={'20%'}>Exp. no. variants</TableCell>
        <TableCell width={'20%'}>Obs. no. variants</TableCell>
        <TableCell width={'20%'}>Constraint metric</TableCell>
      </TableHeader>
      <TableRow>
        <TableTitleColumn />
        <TableCell width={'40%'}>Synonymous</TableCell>
        <TableCell width={'20%'}>{constraintData.exp_syn.toFixed(1)}</TableCell>
        <TableCell width={'20%'}>{constraintData.n_syn}</TableCell>
        <TableCell width={'20%'}>Z = {constraintData.syn_z.toFixed(2)}</TableCell>
      </TableRow>
      <TableRow>
        <TableTitleColumn />
        <TableCell width={'40%'}>Missense</TableCell>
        <TableCell width={'20%'}>{constraintData.exp_mis.toFixed(1)}</TableCell>
        <TableCell width={'20%'}>{constraintData.n_mis}</TableCell>
        <TableCell width={'20%'}>Z = {constraintData.mis_z.toFixed(2)}</TableCell>
      </TableRow>
      <TableRow>
        <TableTitleColumn />
        <TableCell width={'40%'}>LoF</TableCell>
        <TableCell width={'20%'}>{constraintData.exp_lof.toFixed(1)}</TableCell>
        <TableCell width={'20%'}>{constraintData.n_lof}</TableCell>
        <TableCell width={'20%'}>pLI = {constraintData.pLI.toFixed(2)}</TableCell>
      </TableRow>
    </TableRows>
  </Table>
)

ConstraintTable.propTypes = {
  constraintData: PropTypes.object.isRequired,
}

const PlaceholderTable = Table.extend`
  opacity: 0.4;
`

const ConstraintMessage = TableCell.extend`
  text-align: center;
`

const ConstraintTablePlaceholder = ({ message }) => (
  <PlaceholderTable>
    <TableRows>
      <TableHeader>
        <TableTitleColumn />
        <TableCell width={'40%'}>Category</TableCell>
        <TableCell>Exp. no. variants</TableCell>
        <TableCell>Obs. no. variants</TableCell>
        <TableCell>Constraint metric</TableCell>
      </TableHeader>
      <TableRow>
        <TableTitleColumn />
        <TableCell width={'40%'}>Synonymous</TableCell>
        <TableCell width={'60%'} />
      </TableRow>
      <TableRow>
        <TableTitleColumn />
        <TableCell width={'40%'}>Missense</TableCell>
        <ConstraintMessage width={'60%'}>{message}</ConstraintMessage>
      </TableRow>
      <TableRow>
        <TableTitleColumn />
        <TableCell width={'40%'}>LoF</TableCell>
        <TableCell width={'60%'} />
      </TableRow>
    </TableRows>
  </PlaceholderTable>
)

ConstraintTablePlaceholder.propTypes = {
  message: PropTypes.string.isRequired,
}

export const ConstraintTableOrPlaceholder = connect(state => ({
  geneData: geneData(state).toJS(),
  selectedVariantDataset: selectedVariantDataset(state),
}))(({ geneData, selectedVariantDataset }) => {
  if (selectedVariantDataset === 'exac') {
    const exacConstraint = geneData.exacv1_constraint
    if (!exacConstraint) {
      return <ConstraintTablePlaceholder message="ExAC constraint not available for this gene" />
    }
    return <ConstraintTable constraintData={exacConstraint} />
  }

  return <ConstraintTablePlaceholder message="gnomAD constraint coming soon!" />
})
