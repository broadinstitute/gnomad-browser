/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable camelcase */
/* eslint-disable quote-props */

import React from 'react'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import styled from 'styled-components'

import { geneData } from '@broad/gene-page/src/resources/genes'
import { allVariants } from '@broad/gene-page/src/resources/variants'

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

const GeneInfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 1000px;
`

const GeneName = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 10px;
`

const Symbol = styled.h1`
  margin-right: 10px;
`

const SubHeader = styled.h2`
  font-size: 18px;
`

const GeneDetails = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  width: 1050px;
`

const GeneAttributes = styled.div`
  display: flex;
  font-size: 14px;
  flex-direction: column;
  align-items: space-between;
`

const GeneAttribute = styled.div`
  margin-bottom: 2px;
`

const DiseaseBurdenTable = Table.extend`
  margin-bottom: 20px;
  margin-top: 20px;
`

const DiseaseBurdenHeader = SubHeader.extend`
  margin-top: 20px;
`

const translations = {
  odds_ratio: 'Odds ratio',
  ef: 'Etiological fraction',
  all: 'All',
  lof: 'LoF',
  missense: 'Missense',
}

const GeneInfo = ({ gene, variants, currentDisease }) => {
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
    <GeneInfoContainer>
      <GeneName>
        <Symbol>{gene_name}</Symbol>
        <SubHeader>{full_gene_name}</SubHeader>
      </GeneName>
      <GeneDetails>
        <GeneAttributes>
          <GeneAttribute>
            <strong>Ensembl ID:</strong> {gene_id}
          </GeneAttribute>
          <GeneAttribute>
            <strong>Total variants</strong> {variants.size}
          </GeneAttribute>
          <GeneAttribute>
            <strong>Disease: </strong>{DISEASES[geneDiseaseInfo.Disease]}
          </GeneAttribute>
          <GeneAttribute>
            <strong>Inheritance mode: </strong>{geneDiseaseInfo.InheritanceMode}
          </GeneAttribute>
          <GeneAttribute>
            <strong>Disease mechanism: </strong>{geneDiseaseInfo.DiseaseMechanism}
          </GeneAttribute>
          <GeneAttribute>
            <strong>Variant classes: </strong>{geneDiseaseInfo.VariantClasses}
          </GeneAttribute>
          <DiseaseBurdenHeader>Disease burden analysis (case v. control)</DiseaseBurdenHeader>
          <DiseaseBurdenTable>
            <TableRows>
              <TableHeader>
                <TableTitleColumn />
                {Object.keys(calculations.all).map(calculation =>
                  (<TableCell>{translations[calculation]}</TableCell>))}
              </TableHeader>
              {Object.keys(calculations).map(category => (
                <TableRow>
                  <TableTitleColumn>{translations[category]}</TableTitleColumn>
                  {Object.keys(calculations.all).map((calculation) => {
                    return (
                      <TableCell>
                        {calculations[category][calculation].toPrecision(3)}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableRows>
          </DiseaseBurdenTable>
        </GeneAttributes>
        <Table>

          <TableRows>
            <SubHeader>Cohort summary</SubHeader>
            <TableHeader>
              <TableTitleColumn />
              {Object.keys(diseaseCohortBreakdown).map(category =>
                (<TableCell>{translations[category]}</TableCell>))}
            </TableHeader>
            {Object.keys(COHORTS).map(cohort => (
              <TableRow>
                <TableTitleColumn>{COHORTS[cohort]}</TableTitleColumn>
                {Object.keys(diseaseCohortBreakdown).map((category) => {
                  const [ac, an] = diseaseCohortBreakdown[category][cohort]
                  const allele_frequency = (ac / an)
                  if (!isNaN(allele_frequency)) {
                    return <TableCell>{`${ac} (${allele_frequency.toPrecision(3)})`}</TableCell>
                  }
                  return <TableCell>{`${ac} (0)`}</TableCell>
                })}
              </TableRow>
            ))}
          </TableRows>
        </Table>
      </GeneDetails>
    </GeneInfoContainer>
  )
}
GeneInfo.propTypes = {
  gene: PropTypes.object.isRequired,
  variants: PropTypes.any.isRequired,
}
export default connect(
  state => ({
    gene: geneData(state),
    variants: allVariants(state)
  })
)(GeneInfo)
