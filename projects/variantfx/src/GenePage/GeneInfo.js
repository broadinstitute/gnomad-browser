/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable camelcase */
/* eslint-disable quote-props */

import React from 'react'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { createSelector } from 'reselect'

import { geneData } from '@broad/redux-genes'

import {
  allVariantsInCurrentDataset,
} from '@broad/redux-variants'

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
  VerticalTextLabels,
  TableVerticalLabel,
  VerticalLabelText,
  Table,
  TableRows,
  TableRow,
  TableHeader,
  TableCell,
} from '@broad/ui'

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

const DiseaseBurdenTable = styled(Table)`
  margin-bottom: 20px;
  margin-top: 0;
`


const GeneAttributeKeysCustom = styled(GeneAttributeKeys)`
  width: 40%;
`

const TableRowTotal = styled(TableRow)`
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

  const CASE_COHORTS = ['RBH', 'EGY', 'SGP', 'LMM', 'OMG']
  const CONTROL_COHORTS = ['RBH', 'EGY', 'SGP']

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
                  (<TableCell key={`header-${calculation}`} width={'130px'}>{translations[calculation]}</TableCell>))}
              </TableHeader>
              {['PTV', 'MIS', 'PAL'].map(category => (
                <TableRow key={`burden-${category}`}>
                  <TableCell width={'100px'}>{translations[category]}</TableCell>
                  {['OR', 'EF', 'CE'].map((calculation) => {
                    const calculationValue = currentGeneDiseaseData.get(`${category}_${calculation}`)
                    return calculationValue ?
                      <TableCell key={`burden-${category}-${calculation}`} width={'130px'}>
                        {calculationValue.toPrecision(3)}{calculation === 'CE' || ' (' + currentGeneDiseaseData.get(`${category}_${calculation}_lb`).toPrecision(3) + ' - ' + currentGeneDiseaseData.get(`${category}_${calculation}_ub`).toPrecision(3) + ')'}
                      </TableCell>
                      : <TableCell width={'130px'}>{'N/A'}</TableCell>
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
                <TableCell width={COHORT_TABLE_COLUMN_WIDTH}>Protein-altering</TableCell>

              </TableHeader>
              {CASE_COHORTS.map(cohort => (
                <TableRow key={cohort}>
                  <TableCell width={COHORT_TABLE_COHORT_WIDTH}>{COHORTS[cohort]}</TableCell>
                  <TableCell width={COHORT_TABLE_COLUMN_WIDTH}>{currentGeneDiseaseData.get(`${cohort}_DIS_Ind`)}</TableCell>
                  {['PTV', 'MIS', 'PAL'].map(csq => (
                    <TableCell key={`${csq}-${cohort}`} width={COHORT_TABLE_COLUMN_WIDTH}>
                      {currentGeneDiseaseData.get(`${cohort}_${csq}_FF_AC`)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              <TableRowTotal>
                <TableCell width={COHORT_TABLE_COHORT_WIDTH}>Total cases</TableCell>
                <TableCell width={COHORT_TABLE_COLUMN_WIDTH}>{currentGeneDiseaseData.get('Case_Ind')}</TableCell>
                {['PTV', 'MIS', 'PAL'].map(csq => (
                  <TableCell key={`${csq}-case`} width={COHORT_TABLE_COLUMN_WIDTH}>
                    {CASE_COHORTS.reduce((sum, cohort) => sum + currentGeneDiseaseData.get(`${cohort}_${csq}_FF_AC`), 0)}
                  </TableCell>
                ))}
              </TableRowTotal>
              {CONTROL_COHORTS.map(cohort => (
                <TableRow key={cohort}>
                  <TableCell width={COHORT_TABLE_COHORT_WIDTH}>{COHORTS[cohort]}</TableCell>
                  <TableCell width={COHORT_TABLE_COLUMN_WIDTH}>{currentGeneDiseaseData.get(`${cohort}_HVO_Ind`)}</TableCell>
                  {['PTV', 'MIS', 'PAL'].map(csq => (
                    <TableCell key={`${csq}-${cohort}`} width={COHORT_TABLE_COLUMN_WIDTH}>
                      {currentGeneDiseaseData.get(`${cohort}_HVO_${csq}_FF_AC`)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              <TableRow>
                <TableCell width={COHORT_TABLE_COHORT_WIDTH}>gnomAD</TableCell>
                <TableCell width={COHORT_TABLE_COLUMN_WIDTH}>{currentGeneDiseaseData.get('GNO_Ind')}</TableCell>
                {['PTV', 'MIS', 'PAL'].map(csq => (
                  <TableCell key={`${csq}-gnomad`} width={COHORT_TABLE_COLUMN_WIDTH}>
                    {currentGeneDiseaseData.get(`GNO_${csq}_FF_AC`)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRowTotal>
                <TableCell width={COHORT_TABLE_COHORT_WIDTH}>Total controls</TableCell>
                <TableCell width={COHORT_TABLE_COLUMN_WIDTH}>{currentGeneDiseaseData.get('Control_Ind')}</TableCell>
                {['PTV', 'MIS', 'PAL'].map(csq => (
                  <TableCell key={`${csq}-control`} width={COHORT_TABLE_COLUMN_WIDTH}>
                    {CONTROL_COHORTS.reduce((sum, cohort) => sum + currentGeneDiseaseData.get(`${cohort}_HVO_${csq}_FF_AC`), 0) + currentGeneDiseaseData.get(`GNO_${csq}_FF_AC`)}
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
const variantCount = createSelector(
  [currentGeneDiseaseData, allVariantsInCurrentDataset],
  (geneDisease, variants) => variants.filter(v => v[`${geneDisease.get('Disease')}_AC`] > 0 || v.CTL_AC > 0).size
)
export default connect(
  state => ({
    gene: geneData(state),
    variantCount: variantCount(state),
    currentGeneDiseaseData: currentGeneDiseaseData(state),
  })
)(GeneInfo)
