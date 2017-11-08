/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable camelcase */
/* eslint-disable quote-props */

import React from 'react'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import styled from 'styled-components'

import { geneData } from '@broad/gene-page/src/resources/genes'

import {
  variantCount,
} from '@broad/gene-page/src/resources/variants'

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
  ItemWrapper,
} from '@broad/gene-page/src/presentation/GeneInfoStyles'

import {
  VerticalTextLabels,
  TableVerticalLabel,
  VerticalLabelText,
  Table,
  TableRows,
  TableRow,
  TableHeader,
  TableCell,
} from '@broad/ui/src/tables/SimpleTable'

import {
  currentGeneDiseaseData,
} from '../redux'

import {
  DISEASES,
  COHORTS,
} from '../utilities'


const SubHeader = styled.h2`
  font-size: 18px;
  margin-top: 30px;
  margin-bottom: 20px;
 `

const DiseaseBurdenTable = Table.extend`
  margin-bottom: 20px;
  margin-top: 0;
`


const GeneAttributeKeysCustom = GeneAttributeKeys.extend`
  width: 40%;
`

const TableRowTotal = TableRow.extend`
  font-weight: bold;
  border-bottom: 1px solid #000;
  ${''}
`

const translations = {
  OR: 'Odds ratio',
  EF: 'Etiological fraction',
  CE: 'Case excess',
  PTV: 'Truncating',
  MIS: 'Missense',
  PAL: 'Protein-altering',
}

const GeneInfo = ({
  gene,
  currentGeneDiseaseData,
  variantCount,
}) => {
  const {
    gene_name,
    gene_id,
    full_gene_name,
    omim_accession,
  } = gene.toJS()

  const COHORT_TABLE_COHORT_WIDTH = '130px'
  const COHORT_TABLE_COLUMN_WIDTH = '60px'

  return (
    <GeneInfoWrapper>
      <GeneNameWrapper>
        <GeneSymbol>{gene_name}</GeneSymbol>
        <GeneLongName>{full_gene_name}</GeneLongName>
      </GeneNameWrapper>
      <GeneDetails>
        <ItemWrapper style={{ alignItems: 'center' }}>
          <SubHeader>Gene/disease info</SubHeader>
          <GeneAttributes>
            <GeneAttributeKeysCustom>
              <GeneAttributeKey>
                Ensembl ID
              </GeneAttributeKey>
              <GeneAttributeKey>
                Number of variants
              </GeneAttributeKey>
              <GeneAttributeKey>
                Disease
              </GeneAttributeKey>
              <GeneAttributeKey>
                Inheritance mode
              </GeneAttributeKey>
              <GeneAttributeKey>
                Disease mechanism
              </GeneAttributeKey>
              <GeneAttributeKey>
                Variant classes
              </GeneAttributeKey>
            </GeneAttributeKeysCustom>
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
                {DISEASES[currentGeneDiseaseData.get('Disease')]}
              </GeneAttributeValue>
              <GeneAttributeValue>
                {currentGeneDiseaseData.get('InheritanceMode')}
              </GeneAttributeValue>
              <GeneAttributeValue>
                {currentGeneDiseaseData.get('DiseaseMechanism')}
              </GeneAttributeValue>
              <GeneAttributeValue>
                {currentGeneDiseaseData.get('VariantClasses')}
              </GeneAttributeValue>
            </GeneAttributeValues>
          </GeneAttributes>
          <SubHeader>Disease burden analysis (case v. control)</SubHeader>
          <DiseaseBurdenTable>
            <TableRows>
              <TableHeader>
                <TableCell width={'100px'} />
                {['OR', 'EF', 'CE'].map(calculation =>
                  (<TableCell key={`header-${calculation}`} width={'70px'}>{translations[calculation]}</TableCell>))}
              </TableHeader>
              {['PTV', 'MIS', 'PAL'].map(category => (
                <TableRow key={`burden-${category}`}>
                  <TableCell width={'100px'}>{translations[category]}</TableCell>
                  {['OR', 'EF', 'CE'].map((calculation) => {
                    const calculationValue = currentGeneDiseaseData.get(`${category}_${calculation}`)
                    return calculationValue ?
                      <TableCell key={`burden-${category}-${calculation}`} width={'70px'}>
                        {calculationValue.toPrecision(3)}
                      </TableCell>
                      : <TableCell width={'70px'}>{'N/A'}</TableCell>
                  })}
                </TableRow>
              ))}
            </TableRows>
          </DiseaseBurdenTable>
        </ItemWrapper>
        <ItemWrapper>
          <SubHeader>Cohort summary</SubHeader>
          <Table>
            <VerticalTextLabels>
              <TableVerticalLabel height={10}>
                <VerticalLabelText>
                  {' '}
                </VerticalLabelText>
              </TableVerticalLabel>
              <TableVerticalLabel height={170}>
                <VerticalLabelText>
                  Cases
                </VerticalLabelText>
              </TableVerticalLabel>
              <TableVerticalLabel height={130}>
                <VerticalLabelText>
                  Controls
                </VerticalLabelText>
              </TableVerticalLabel>
            </VerticalTextLabels>
            <TableRows>
              <TableHeader>
                <TableCell width={COHORT_TABLE_COHORT_WIDTH}>Cohort</TableCell>
                <TableCell width={COHORT_TABLE_COLUMN_WIDTH}>n</TableCell>
                <TableCell width={COHORT_TABLE_COLUMN_WIDTH}>Protein-truncating</TableCell>
                <TableCell width={COHORT_TABLE_COLUMN_WIDTH}>Missense</TableCell>
                <TableCell width={COHORT_TABLE_COLUMN_WIDTH}>Other</TableCell>
                <TableCell width={COHORT_TABLE_COLUMN_WIDTH}>Protein-altering</TableCell>

              </TableHeader>
              {Object.keys(COHORTS).map(cohort => (
                <TableRow>
                  <TableCell width={COHORT_TABLE_COHORT_WIDTH}>{COHORTS[cohort]}</TableCell>
                  <TableCell width={COHORT_TABLE_COLUMN_WIDTH}>{currentGeneDiseaseData.get(`${cohort}_DIS_Ind`)}</TableCell>
                  {['PTV', 'MIS', 'ONT', 'PAL'].map(csq => (
                    <TableCell key={`${csq}-${cohort}`} width={COHORT_TABLE_COLUMN_WIDTH}>
                      {currentGeneDiseaseData.get(`${cohort}_${csq}_FF_AC`)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              <TableRowTotal>
                <TableCell width={COHORT_TABLE_COHORT_WIDTH}>Total cases</TableCell>
                <TableCell width={COHORT_TABLE_COLUMN_WIDTH}>{currentGeneDiseaseData.get('Case_Ind')}</TableCell>
                {['PTV', 'MIS', 'ONT', 'PAL'].map(csq => (
                  <TableCell key={`${csq}-case`} width={COHORT_TABLE_COLUMN_WIDTH}>
                    {currentGeneDiseaseData.get(`${csq}_a`)}
                  </TableCell>
                ))}
              </TableRowTotal>
              {Object.keys(COHORTS).slice(0, 3).map(cohort => (
                <TableRow>
                  <TableCell width={COHORT_TABLE_COHORT_WIDTH}>{COHORTS[cohort]}</TableCell>
                  <TableCell width={COHORT_TABLE_COLUMN_WIDTH}>{currentGeneDiseaseData.get(`${cohort}_HVO_Ind`)}</TableCell>
                  {['PTV', 'MIS', 'ONT', 'PAL'].map(csq => (
                    <TableCell key={`${csq}-${cohort}`} width={COHORT_TABLE_COLUMN_WIDTH}>
                      {currentGeneDiseaseData.get(`${cohort}_HVO_${csq}_FF_AC`)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              <TableRow>
                <TableCell width={COHORT_TABLE_COHORT_WIDTH}>gnomAD</TableCell>
                <TableCell width={COHORT_TABLE_COLUMN_WIDTH}>{currentGeneDiseaseData.get('GNO_Ind')}</TableCell>
                {['PTV', 'MIS', 'ONT', 'PAL'].map(csq => (
                  <TableCell key={`${csq}-gnomad`} width={COHORT_TABLE_COLUMN_WIDTH}>
                    {currentGeneDiseaseData.get(`GNO_${csq}_FF_AC`)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRowTotal>
                <TableCell width={COHORT_TABLE_COHORT_WIDTH}>Total controls</TableCell>
                <TableCell width={COHORT_TABLE_COLUMN_WIDTH}>{currentGeneDiseaseData.get('Control_Ind')}</TableCell>
                {['PTV', 'MIS', 'ONT', 'PAL'].map(csq => (
                  <TableCell key={`${csq}-control`} width={COHORT_TABLE_COLUMN_WIDTH}>
                    {currentGeneDiseaseData.get(`${csq}_c`)}
                  </TableCell>
                ))}
              </TableRowTotal>
            </TableRows>
          </Table>
        </ItemWrapper>
      </GeneDetails>
    </GeneInfoWrapper>
  )
}
GeneInfo.propTypes = {
  gene: PropTypes.object.isRequired,
  currentGeneDiseaseData: PropTypes.any.isRequired,
  variantCount: PropTypes.number.isRequired,
}
export default connect(
  state => ({
    gene: geneData(state),
    variantCount: variantCount(state),
    currentGeneDiseaseData: currentGeneDiseaseData(state),

  })
)(GeneInfo)
