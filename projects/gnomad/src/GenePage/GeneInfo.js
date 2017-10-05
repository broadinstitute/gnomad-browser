/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable camelcase */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { geneData, variantCount } from '@broad/gene-page'

import {
  GeneInfoWrapper,
  GeneNameWrapper,
  GeneSymbol,
  GeneLongName,
  GeneDetails,
  GeneAttributes,
  GeneAttribute,
} from '@broad/gene-page/src/presentation/GeneInfoStyles'

import {
  Table,
  TableRows,
  TableRow,
  TableHeader,
  TableCell,
  TableTitleColumn,
} from '@broad/ui/src/tables/SimpleTable'

const GeneInfo = ({ geneData, variantCount }) => {
  const {
    gene_name,
    gene_id,
    full_gene_name,
    omim_accession,
  } = geneData.toJS()
  return (
    <GeneInfoWrapper>
      <GeneNameWrapper>
        <GeneSymbol>{gene_name}</GeneSymbol>
        <GeneLongName>{full_gene_name}</GeneLongName>
      </GeneNameWrapper>
      <GeneDetails>
        <GeneAttributes>
          <GeneAttribute>
            <strong>Ensembl ID:</strong> {gene_id}
          </GeneAttribute>
          <GeneAttribute>
            <strong>Total variants</strong> {variantCount}
          </GeneAttribute>
          <GeneAttribute>
            <strong>OMIM: </strong>omim_accession
          </GeneAttribute>
        </GeneAttributes>
        {/* <GeneLongName>Disease burden analysis (case v. control)</GeneLongName> */}
        <Table>
          <TableRows>
            <TableHeader>
              <TableTitleColumn />
              <TableCell>Category</TableCell>
              <TableCell>Expected no. variants</TableCell>
              <TableCell>Observed no. variants</TableCell>
              <TableCell>Constraint metric</TableCell>
            </TableHeader>
            <TableRow>
              <TableTitleColumn />
              <TableCell>Synonymous</TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow>
              <TableTitleColumn />
              <TableCell>Missense</TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow>
              <TableTitleColumn />
              <TableCell>LoF</TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow>
              <TableTitleColumn />
              <TableCell>CNV</TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableRows>
        </Table>

      </GeneDetails>
    </GeneInfoWrapper>
  )
}

GeneInfo.propTypes = {
  geneData: PropTypes.object.isRequired,
  variantCount: PropTypes.number.isRequired,
}

export default connect(
  state => ({
    geneData: geneData(state),
    variantCount: variantCount(state)
  })
)(GeneInfo)
