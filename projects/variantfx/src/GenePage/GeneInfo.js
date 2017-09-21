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
  DISEASES,
  GENE_DISEASE_INFO,

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

const GeneInfo = ({ gene, variants }) => {
  const {
    gene_name,
    gene_id,
    full_gene_name,
    omim_accession,
  } = gene.toJS()

  // const processedVariants = variants.toJS().map(v => {})

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
        </GeneAttributes>
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
