/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable camelcase */
/* eslint-disable quote-props */

import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

import {
  DISEASES,
  GENE_DISEASE_INFO
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

const FullName = styled.h2`
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

const GeneStats = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`

const GeneStatsRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 20px;
  font-size: 14px;
  border-bottom: 1px solid lightgrey;
`

const GeneStatsHeader = GeneStatsRow.extend`
  font-weight: bold;
  border-bottom: 1px solid black;
`

const GeneStatsCell = styled.div`
  width: 100px;
`

const GeneStatsTitleColumn = GeneStatsCell.extend`
  width: 100px;
`

const GeneInfo = ({ gene, variantCount }) => {
  const {
    gene_name,
    gene_id,
    full_gene_name,
    omim_accession,
  } = gene.toJS()

  const currentDisease = 'HCM'
  const geneDiseaseInfo = GENE_DISEASE_INFO.find(geneDisease =>
    geneDisease.Gene === gene_name && geneDisease.Disease === currentDisease
  )
  return (
    <GeneInfoContainer>
      <GeneName>
        <Symbol>{gene_name}</Symbol>
        <FullName>{full_gene_name}</FullName>
      </GeneName>
      <GeneDetails>
        <GeneAttributes>
          <GeneAttribute>
            <strong>Ensembl ID:</strong> {gene_id}
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
        </GeneAttributes>
      </GeneDetails>
    </GeneInfoContainer>
  )
}
GeneInfo.propTypes = {
  gene: PropTypes.object.isRequired,
  variantCount: PropTypes.number.isRequired,
}
export default GeneInfo
