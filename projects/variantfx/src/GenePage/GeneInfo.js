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
  allVariantsInCurrentDatasetAsList,
  actions as variantActions,
} from '@broad/gene-page/src/resources/variants'

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
  ItemWrapper,
} from '@broad/gene-page/src/presentation/GeneInfoStyles'

import {
  Table,
  TableRows,
  TableRow,
  TableHeader,
  TableCell,
  TableTitleColumn,
} from '@broad/ui/src/tables/SimpleTable'

import {
  DISEASES,
  GENE_DISEASE_INFO,
  COHORTS,
  getGenePageCalculations,
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

const translations = {
  odds_ratio: 'Odds ratio',
  ef: 'Etiological fraction',
  all: 'All',
  lof: 'LoF',
  missense: 'Missense',
}

const GeneInfo = ({ gene, variants, currentDisease, variantCount }) => {
  const {
    gene_name,
    gene_id,
    full_gene_name,
    omim_accession,
  } = gene.toJS()

  const geneDiseaseInfo = GENE_DISEASE_INFO.find(geneDisease =>
    geneDisease.Gene === gene_name && geneDisease.Disease === 'HCM' // hack, only 1 disease available
  )

  const {
    diseaseCohortBreakdown,
    calculations
  } = getGenePageCalculations(variants.toJS(), currentDisease)

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
                {DISEASES[geneDiseaseInfo.Disease]}
              </GeneAttributeValue>
              <GeneAttributeValue>
                {geneDiseaseInfo.InheritanceMode}
              </GeneAttributeValue>
              <GeneAttributeValue>
                {geneDiseaseInfo.DiseaseMechanism}
              </GeneAttributeValue>
              <GeneAttributeValue>
                {geneDiseaseInfo.VariantClasses}
              </GeneAttributeValue>
            </GeneAttributeValues>
          </GeneAttributes>
          <SubHeader>Disease burden analysis (case v. control)</SubHeader>
          <DiseaseBurdenTable>
            <TableRows>
              <TableHeader>
                <TableCell width={'70px'} />
                {Object.keys(calculations.all).map(calculation =>
                  (<TableCell width={'70px'}>{translations[calculation]}</TableCell>))}
              </TableHeader>
              {Object.keys(calculations).map(category => (
                <TableRow>
                  <TableCell width={'70px'}>{translations[category]}</TableCell>
                  {Object.keys(calculations.all).map((calculation) => {
                    return (
                      <TableCell width={'70px'}>
                        {calculations[category][calculation].toPrecision(3)}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableRows>
          </DiseaseBurdenTable>
        </ItemWrapper>
        <ItemWrapper>
        <SubHeader>Cohort summary</SubHeader>
          <Table>
            <TableRows>
              <TableHeader>
                <TableCell width={'100px'} />
                {Object.keys(diseaseCohortBreakdown).map(category =>
                  (<TableCell width={'100px'}>{translations[category]}</TableCell>))}
              </TableHeader>
              {Object.keys(COHORTS).map(cohort => (
                <TableRow>
                  <TableCell width={'100px'}>{COHORTS[cohort]}</TableCell>
                  {Object.keys(diseaseCohortBreakdown).map((category) => {
                    const [ac, an] = diseaseCohortBreakdown[category][cohort]
                    const allele_frequency = (ac / an)
                    if (!isNaN(allele_frequency)) {
                      return <TableCell width={'100px'}>{`${ac} (${allele_frequency.toPrecision(3)})`}</TableCell>
                    }
                    return <TableCell width={'100px'}>{`${ac} (0)`}</TableCell>
                  })}
                </TableRow>
              ))}
            </TableRows>
          </Table>
        </ItemWrapper>
      </GeneDetails>
    </GeneInfoWrapper>
  )
}
GeneInfo.propTypes = {
  gene: PropTypes.object.isRequired,
  variants: PropTypes.any.isRequired,
}
export default connect(
  state => ({
    gene: geneData(state),
    variantCount: variantCount(state),
    variants: allVariantsInCurrentDatasetAsList(state)

  })
)(GeneInfo)
