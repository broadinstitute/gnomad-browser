/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable camelcase */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { geneData } from '@broad/gene-page/src/resources/genes'
import { variantCount, selectedVariantDataset } from '@broad/gene-page/src/resources/variants'

import { SectionTitle } from '@broad/gene-page/src/presentation/UserInterface'

import {
  GeneInfoWrapper,
  GeneNameWrapper,
  GeneSymbol,
  GeneLongName,
  GeneDetails,
  GeneAttributes,
  GeneAttributeKeys,
  GeneAttributeKey,
  GeneAttributeValues,
  GeneAttributeValue,
} from '@broad/gene-page/src/presentation/GeneInfoStyles'

import {
  Table,
  TableRows,
  TableRow,
  TableHeader,
  TableCell,
  TableTitleColumn,
} from '@broad/ui/src/tables/SimpleTable'

const GeneDetailsResponsive = GeneDetails.extend`
  align-items: center;
  @media (max-width: 900px) {
    flex-direction: column;
  }
`

const TableWrapper = styled.div`
  width: 100%;
`

const ConstraintTable = ({ constraintData }) => (
  <TableWrapper>
    <SectionTitle>Gene constraint</SectionTitle>
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
          <TableCell width={'20%'}>Z = {constraintData.syn_z.toFixed(1)}</TableCell>
        </TableRow>
        <TableRow>
          <TableTitleColumn />
          <TableCell width={'40%'}>Missense</TableCell>
          <TableCell width={'20%'}>{constraintData.exp_mis.toFixed(1)}</TableCell>
          <TableCell width={'20%'}>{constraintData.n_mis}</TableCell>
          <TableCell width={'20%'}>Z = {constraintData.mis_z.toFixed(1)}</TableCell>
        </TableRow>
        <TableRow>
          <TableTitleColumn />
          <TableCell width={'40%'}>LoF</TableCell>
          <TableCell width={'20%'}>{constraintData.exp_lof.toFixed(1)}</TableCell>
          <TableCell width={'20%'}>{constraintData.n_lof}</TableCell>
          <TableCell width={'20%'}>pLI = {constraintData.lof_z.toFixed(1)}</TableCell>
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
  </TableWrapper>
)
ConstraintTable.propTypes = { constraintData: PropTypes.object.isRequired }

const PlaceholderTable = Table.extend`
  opacity: 0.4;
`

const ComingSoon = TableCell.extend`
  width: 100%;
  text-align: center;
`

const ConstraintTablePlaceholder = () => (
  <PlaceholderTable>
    <div>
      <SectionTitle>Gene constraint</SectionTitle>
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
          <ComingSoon>gnomAD constraint coming soon!</ComingSoon>
        </TableRow>
        <TableRow>
          <TableTitleColumn />
          <TableCell width={'40%'}>Missense</TableCell>
          <ComingSoon>Click here to see ExAC values</ComingSoon>

        </TableRow>
        <TableRow>
          <TableTitleColumn />
          <TableCell width={'40%'}>LoF</TableCell>
          <TableCell />
        </TableRow>
        {/* <TableRow>
          <TableTitleColumn />
          <TableCell>CNV</TableCell>
          <TableCell />
          <TableCell />
          <TableCell />
        </TableRow> */}
      </TableRows>
    </div>
  </PlaceholderTable>
)

const GeneInfo = ({ geneData, variantCount, selectedVariantDataset }) => {
  const {
    gene_name,
    gene_id,
    start,
    stop,
    chrom,
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
      <GeneDetailsResponsive>
        <GeneAttributes>
          <GeneAttributeKeys>
            <GeneAttributeKey>
              Ensembl ID
            </GeneAttributeKey>
            <GeneAttributeKey>
              Number of variants
            </GeneAttributeKey>
            <GeneAttributeKey>
              UCSC Browser
            </GeneAttributeKey>
            <GeneAttributeKey>
              GeneCards
            </GeneAttributeKey>
            <GeneAttributeKey>
              OMIM
            </GeneAttributeKey>
            <GeneAttributeKey>
              External references
            </GeneAttributeKey>
          </GeneAttributeKeys>
          <GeneAttributeValues>
            <GeneAttributeValue>
              <a
                target="_blank"
                href={`http://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${gene_id}`}
              >
                {gene_id}
              </a>
            </GeneAttributeValue>
            <GeneAttributeValue>
              {variantCount}
            </GeneAttributeValue>
            <GeneAttributeValue>
              <a
                target="_blank"
                href={`http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg19&position=chr${chrom}%3A${start - 1}-${stop}&hgt.customText=http://personal.broadinstitute.org/ruderfer/exac/exac-final.autosome-1pct-sq60-qc-prot-coding.cnv.bed`}
              >
                {`${chrom}:${start}:${stop}`}
              </a>
            </GeneAttributeValue>
            <GeneAttributeValue>
              <a
                target="_blank"
                href={`http://www.genecards.org/cgi-bin/carddisp.pl?gene=${gene_name}`}
              >
                {gene_name}
              </a>
            </GeneAttributeValue>
            <GeneAttributeValue>
              <a
                target="_blank"
                href={`http://omim.org/entry/${omim_accession}`}
              >
                {omim_accession}
              </a>
            </GeneAttributeValue>
            <GeneAttributeValue>
              <select
                onChange={event => window.open(event.target.value)}
                value={selectedVariantDataset}
              >
                <option value={`http://en.wikipedia.org/wiki/${gene_name}`}>Wikipedia</option>
                <option value={`http://www.ncbi.nlm.nih.gov/pubmed?term=${gene_name}`}>PubMed Search</option>
                <option value={`http://www.wikigenes.org/?search=${gene_name}`}>Wikigenes</option>
                <option value={`http://www.gtexportal.org/home/gene/${gene_name}`}>GTEx (Expression)</option>
              </select>
            </GeneAttributeValue>
          </GeneAttributeValues>
        </GeneAttributes>
        {selectedVariantDataset === 'exacVariants' &&
          <ConstraintTable constraintData={exacv1_constraint} />}
        {selectedVariantDataset === 'gnomadCombinedVariants' &&
          <ConstraintTablePlaceholder />}
      </GeneDetailsResponsive>
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
