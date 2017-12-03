/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable camelcase */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { geneData, regionalConstraint } from '@broad/redux-genes'

import {
  variantCount,
  selectedVariantDataset,
  actions as variantActions,
} from '@broad/redux-variants'

import { QuestionMark } from '@broad/help'

import {
  SectionTitle,

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

const ConstraintTable = ({
  constraintData,
  setSelectedVariantDataset,
  selectedVariantDataset,
}) => (
  <ItemWrapper>
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

const ConstraintTablePlaceholder = ({
  setSelectedVariantDataset,
  selectedVariantDataset,
  regionalConstraint,
}) => (
  <ItemWrapper>
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
          <ConstraintMessage>gnomAD constraint coming soon!</ConstraintMessage>
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
const ConstraintTableNone = ({
  setSelectedVariantDataset,
  selectedVariantDataset,
}) => (
  <ItemWrapper>
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
          <TableCell />
        </TableRow>
        <TableRow>
          <TableTitleColumn />
          <TableCell width={'40%'}>Missense</TableCell>
          <ConstraintMessage>
            No constraint available
          </ConstraintMessage>

        </TableRow>
        <TableRow>
          <TableTitleColumn />
          <TableCell width={'40%'}>LoF</TableCell>
          <TableCell />
        </TableRow>
      </TableRows>
    </PlaceholderTable>
  </ItemWrapper>
)

const GeneInfo = ({
  geneData,
  variantCount,
  selectedVariantDataset,
  setSelectedVariantDataset,
  regionalConstraint,
}) => {
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
      <GeneDetails>
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
            {/* <GeneAttributeKey>
              External references
            </GeneAttributeKey> */}
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
                {omim_accession || 'N/A'}
              </a>
            </GeneAttributeValue>
            {/* <GeneAttributeValue>
              <a
                target="_blank"
                href={`http://en.wikipedia.org/wiki/${gene_name}`}
              >
                PubMed
              </a>
            </GeneAttributeValue>
            <GeneAttributeValue>
              <a
                target="_blank"
                href={`http://en.wikipedia.org/wiki/${gene_name}`}
              >
                Wikipedia
              </a>
            </GeneAttributeValue>
            <GeneAttributeValue>
              <a
                target="_blank"
                href={`http://www.wikigenes.org/?search=${gene_name}`}
              >
                Wikigenes
              </a>
            </GeneAttributeValue>
            <GeneAttributeValue>
              <a
                target="_blank"
                href={`http://www.gtexportal.org/home/gene/${gene_name}`}
              >
                GTEx (Expression)
              </a>
            </GeneAttributeValue> */}
          </GeneAttributeValues>
        </GeneAttributes>
        {selectedVariantDataset === 'exacVariants' && exacv1_constraint &&
          <ConstraintTable
            constraintData={exacv1_constraint}
            setSelectedVariantDataset={setSelectedVariantDataset}
            selectedVariantDataset={selectedVariantDataset}
          />}
        {selectedVariantDataset === 'exacVariants' && !exacv1_constraint &&
          <ConstraintTableNone
            setSelectedVariantDataset={setSelectedVariantDataset}
            selectedVariantDataset={selectedVariantDataset}
          />}
        {selectedVariantDataset === 'gnomadCombinedVariants' &&
          <ConstraintTablePlaceholder
            regionalConstraint={regionalConstraint}
            setSelectedVariantDataset={setSelectedVariantDataset}
            selectedVariantDataset={selectedVariantDataset}
          />}
      </GeneDetails>
    </GeneInfoWrapper>
  )
}

GeneInfo.propTypes = {
  geneData: PropTypes.object.isRequired,
  variantCount: PropTypes.number.isRequired,
  selectedVariantDataset: PropTypes.string.isRequired,
  regionalConstraint: PropTypes.array,
}

export default connect(
  state => ({
    geneData: geneData(state),
    variantCount: variantCount(state),
    selectedVariantDataset: selectedVariantDataset(state),
    regionalConstraint: regionalConstraint(state),
  }),
  dispatch => ({
    setSelectedVariantDataset: dataset =>
      dispatch(variantActions.setSelectedVariantDataset(dataset)),
  })
)(GeneInfo)
