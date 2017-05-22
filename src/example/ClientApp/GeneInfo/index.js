/* eslint-disable camelcase */

import React, { PropTypes } from 'react'
import css from './styles.css'

const GeneInfo = ({ gene }) => {
  const {
    gene_name,
    gene_id,
    full_gene_name,
    omim_accession,
    minimal_gnomad_variants,
  } = gene
  return (
    <div className={css.geneInfo}>
      <h1>{gene_name}</h1>
      <div className={css.geneDetails}>
        <div className={css.geneAttributes}>
          <div>Number of variants: {minimal_gnomad_variants.length}</div>
          <div>Full name: {full_gene_name}</div>
          <div>Gene ID: {gene_id}</div>
          <div>OMIM accession: {omim_accession}</div>
        </div>
        {/*<div className={css.constraint}>
          <div>Full name: {full_gene_name}</div>
          <div>Gene ID: {gene_id}</div>
          <div>OMIM accession: {omim_accession}</div>
        </div>*/}
      </div>
    </div>
  )
}
GeneInfo.propTypes = {
  gene: PropTypes.object.isRequired,
}
export default GeneInfo
