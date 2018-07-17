import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

import { QuestionMark } from '@broad/help'
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

ConstraintTableHeader.propTypes = {
  selectedVariantDataset: PropTypes.string.isRequired,
  setSelectedVariantDataset: PropTypes.func.isRequired,
}


export const ConstraintTable = ({
  constraintData,
  selectedVariantDataset,
  setSelectedVariantDataset,
}) => (
  <ItemWrapper>
    <ConstraintTableHeader
      selectedVariantDataset={selectedVariantDataset}
      setSelectedVariantDataset={setSelectedVariantDataset}
    />
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
  </ItemWrapper>
)

ConstraintTable.propTypes = {
  constraintData: PropTypes.object.isRequired,
  selectedVariantDataset: PropTypes.string.isRequired,
  setSelectedVariantDataset: PropTypes.func.isRequired,
}


const PlaceholderTable = Table.extend`
  opacity: 0.4;
`

const ConstraintMessage = TableCell.extend`
  text-align: center;
`

export const ConstraintTablePlaceholder = ({
  message,
  selectedVariantDataset,
  setSelectedVariantDataset,
}) => (
  <ItemWrapper>
    <ConstraintTableHeader
      selectedVariantDataset={selectedVariantDataset}
      setSelectedVariantDataset={setSelectedVariantDataset}
    />
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
  </ItemWrapper>
)

ConstraintTablePlaceholder.propTypes = {
  message: PropTypes.string.isRequired,
  selectedVariantDataset: PropTypes.string.isRequired,
  setSelectedVariantDataset: PropTypes.func.isRequired,
}
