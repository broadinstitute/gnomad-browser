import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

import {
  SectionTitle,
  ItemWrapper,
  Table,
  TableRows,
  TableRow,
  TableHeader,
  TableCell,
  TableTitleColumn,
} from '@broad/ui'

import { QuestionMark } from '@broad/help'

const ConstraintTabletop = styled.div`
  display: flex;
  flex-direction: row;

  margin-bottom: 20px;
  align-items: center;
  width: 100%;
`

const ConstraintSectionTitle = SectionTitle.extend`
  display: flex;
  flex-direction: row;
  width: 60%;
  margin: 0;
`

const DatasetSelectionWrapper = styled.div`
  display: flex;
  flex-direction: row;
  flex-grow: 1;
  justify-content: flex-end;
`

const DatasetSelection = styled.div`
  margin-right: 5px;
  font-weight: ${({ isActive }) => isActive ? 'bold' : 'normal'};
  cursor: pointer;
`

const ConstraintTableHeader = ({ selectedVariantDataset, setSelectedVariantDataset }) => (
  <ConstraintTabletop>
    <ConstraintSectionTitle>
      Gene constraint
      <QuestionMark topic={'gene-constraint'} />
    </ConstraintSectionTitle>
    <DatasetSelectionWrapper>
      <DatasetSelection
        isActive={selectedVariantDataset === 'exacVariants'}
        onClick={() => setSelectedVariantDataset('exacVariants')}
      >
        ExAC
      </DatasetSelection>
      <DatasetSelection>
        {'|'}
      </DatasetSelection>
      <DatasetSelection
        isActive={selectedVariantDataset === 'gnomadCombinedVariants'}
        onClick={() => setSelectedVariantDataset('gnomadCombinedVariants')}
      >
        gnomAD
      </DatasetSelection>
    </DatasetSelectionWrapper>
  </ConstraintTabletop>
)

export const ConstraintTable = ({
  constraintData,
  ...rest
}) => (
  <ItemWrapper>
    <ConstraintTableHeader {...rest} />
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
        {/* <TableRow>
          <TableTitleColumn />
          <TableCell>CNV</TableCell>
          <TableCell>{constraintData.exp_cnv ? constraintData.exp_cnv.toFixed(1) : 'N/A'}</TableCell>
          <TableCell>{constraintData.n_cnv || 'N/A'}</TableCell>
          <TableCell>Z = {constraintData.cnv_z ? constraintData.cnv_z.toFixed(1) : 'N/A'}</TableCell>
        </TableRow> */}
      </TableRows>
    </Table>
  </ItemWrapper>
)
ConstraintTable.propTypes = { constraintData: PropTypes.object.isRequired }

const PlaceholderTable = Table.extend`
  opacity: 0.4;
`

const ConstraintMessage = TableCell.extend`
  width: 100%;
  text-align: center;
  cursor: pointer;
`

export const ConstraintTablePlaceholder = props => (
  <ItemWrapper>
    <ConstraintTableHeader {...props} />
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

        </TableRow>
        <TableRow>
          <TableTitleColumn />
          <TableCell width={'40%'}>Missense</TableCell>
          {/* <ConstraintMessage
            onClick={() => setSelectedVariantDataset('exacVariants')}
          >
            Click here to see ExAC values.
          </ConstraintMessage> */}
          <ConstraintMessage>{props.message}</ConstraintMessage>
          <TableCell />
        </TableRow>
        <TableRow>
          <TableTitleColumn />
          <TableCell width={'40%'}>LoF</TableCell>
          <TableCell />
          {/* {regionalConstraint.length > 0 ? <ConstraintMessage onClick={() => setSelectedVariantDataset('exacVariants')}>Also, this gene exhibits regional constraint.</ConstraintMessage> : <TableCell />} */}
        </TableRow>
        {/* <TableRow>
          <TableTitleColumn />
          <TableCell>CNV</TableCell>
          <TableCell />
          <TableCell />
          <TableCell />
        </TableRow> */}
      </TableRows>
    </PlaceholderTable>
  </ItemWrapper>
)
