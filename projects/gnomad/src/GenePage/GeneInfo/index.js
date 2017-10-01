/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable camelcase */

import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

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
//
// const Constraint = styled.div`
//   display: flex;
//   flex-direction: column;
// `

const GeneInfo = ({ gene, variantCount }) => {
  const {
    gene_name,
    gene_id,
    full_gene_name,
    omim_accession,
  } = gene.toJS()
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
        {/*<div className={css.constraint}>
          <div>Full name: {full_gene_name}</div>
          <div>Gene ID: {gene_id}</div>
          <div>OMIM accession: {omim_accession}</div>
        </div>*/}
      </GeneDetails>
    </GeneInfoContainer>
  )
}
GeneInfo.propTypes = {
  gene: PropTypes.object.isRequired,
  variantCount: PropTypes.number,
}
export default GeneInfo
