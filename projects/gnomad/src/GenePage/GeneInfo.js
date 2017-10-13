/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable camelcase */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { geneData } from '@broad/gene-page/src/resources/genes'
import { variantCount, selectedVariantDataset } from '@broad/gene-page/src/resources/variants'

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

const GeneInfo = ({ geneData, variantCount, selectedVariantDataset }) => {
  const {
    gene_name,
    gene_id,
    full_gene_name,
    omim_accession,
    exacv1_constraint,
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
        {selectedVariantDataset === 'exacVariants' && <Table>
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
              <TableCell>{exacv1_constraint.exp_syn.toFixed(1)}</TableCell>
              <TableCell>{exacv1_constraint.n_syn}</TableCell>
              <TableCell>Z = {exacv1_constraint.syn_z.toFixed(1)}</TableCell>
            </TableRow>
            <TableRow>
              <TableTitleColumn />
              <TableCell>Missense</TableCell>
              <TableCell>{exacv1_constraint.exp_mis.toFixed(1)}</TableCell>
              <TableCell>{exacv1_constraint.n_mis}</TableCell>
              <TableCell>Z = {exacv1_constraint.mis_z.toFixed(1)}</TableCell>
            </TableRow>
            <TableRow>
              <TableTitleColumn />
              <TableCell>LoF</TableCell>
              <TableCell>{exacv1_constraint.exp_lof.toFixed(1)}</TableCell>
              <TableCell>{exacv1_constraint.n_lof}</TableCell>
              <TableCell>pLI = {exacv1_constraint.lof_z.toFixed(1)}</TableCell>
            </TableRow>
            <TableRow>
              <TableTitleColumn />
              <TableCell>CNV</TableCell>
              <TableCell>{exacv1_constraint.exp_cnv ? exacv1_constraint.exp_cnv.toFixed(1) : 'N/A'}</TableCell>
              <TableCell>{exacv1_constraint.n_cnv || 'N/A'}</TableCell>
              <TableCell>Z = {exacv1_constraint.cnv_z ? exacv1_constraint.cnv_z.toFixed(1) : 'N/A'}</TableCell>
            </TableRow>
          </TableRows>
        </Table>}
      </GeneDetails>
    </GeneInfoWrapper>
  )
}

GeneInfo.propTypes = {
  geneData: PropTypes.object.isRequired,
  variantCount: PropTypes.number.isRequired,
  selectedVariantDataset: PropTypes.string.isRequired,
}

export default connect(
  state => ({
    geneData: geneData(state),
    variantCount: variantCount(state),
    selectedVariantDataset: selectedVariantDataset(state),
  })
)(GeneInfo)
