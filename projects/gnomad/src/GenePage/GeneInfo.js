/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable camelcase */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { geneData, variantCount } from '@broad/gene-page'

const GeneInfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`

const GeneDetails = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-right: 400px;
`

const GeneAttributes = styled.div`
  display: flex;
  flex-direction: column;
`

const GeneInfo = ({ geneData, variantCount }) => {
  const {
    gene_name,
    gene_id,
    full_gene_name,
    omim_accession,
  } = geneData.toJS()
  return (
    <GeneInfoContainer>
      <h1>{gene_name}</h1>
      <GeneDetails>
        <GeneAttributes>
          <div>Number of variants: {variantCount}</div>
          <div>Full name: {full_gene_name}</div>
          <div>Gene ID: {gene_id}</div>
          <div>OMIM accession: {omim_accession}</div>
        </GeneAttributes>
      </GeneDetails>
    </GeneInfoContainer>
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
