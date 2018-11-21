import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'

import { currentTranscript, geneData } from '@broad/redux-genes'
import { selectedVariantDataset } from '@broad/redux-variants'
import { BaseTable } from '@broad/ui'

import GnomadConstraintTable from './GnomadConstraintTable'

const ConstraintTable = ({ constraintData }) => (
  <BaseTable>
    <thead>
      <tr>
        <th scope="col">Category</th>
        <th scope="col">Exp. no. variants</th>
        <th scope="col">Obs. no. variants</th>
        <th scope="col">Constraint metric</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th scope="row">Synonymous</th>
        <td>{constraintData.exp_syn.toFixed(1)}</td>
        <td>{constraintData.n_syn}</td>
        <td>Z = {constraintData.syn_z.toFixed(2)}</td>
      </tr>
      <tr>
        <th scope="row">Missense</th>
        <td>{constraintData.exp_mis.toFixed(1)}</td>
        <td>{constraintData.n_mis}</td>
        <td>Z = {constraintData.mis_z.toFixed(2)}</td>
      </tr>
      <tr>
        <th scope="row">LoF</th>
        <td>{constraintData.exp_lof.toFixed(1)}</td>
        <td>{constraintData.n_lof}</td>
        <td>pLI = {constraintData.pLI.toFixed(2)}</td>
      </tr>
    </tbody>
  </BaseTable>
)

ConstraintTable.propTypes = {
  constraintData: PropTypes.shape({
    exp_syn: PropTypes.number.isRequired,
    n_syn: PropTypes.number.isRequired,
    syn_z: PropTypes.number.isRequired,
    exp_mis: PropTypes.number.isRequired,
    n_mis: PropTypes.number.isRequired,
    mis_z: PropTypes.number.isRequired,
    exp_lof: PropTypes.number.isRequired,
    n_lof: PropTypes.number.isRequired,
    pLI: PropTypes.number.isRequired,
  }).isRequired,
}

const ConstraintTablePlaceholder = ({ message }) => (
  <BaseTable style={{ opacity: 0.4 }}>
    <thead>
      <tr>
        <th scope="col">Category</th>
        <th scope="col">Exp. no. variants</th>
        <th scope="col">Obs. no. variants</th>
        <th scope="col">Constraint metric</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th scope="row">Synonymous</th>
        <td colSpan={3} />
      </tr>
      <tr>
        <th scope="row">Missense</th>
        <td colSpan={3} style={{ textAlign: 'center' }}>
          {message}
        </td>
      </tr>
      <tr>
        <th scope="row">LoF</th>
        <td colSpan={3} />
      </tr>
    </tbody>
  </BaseTable>
)

ConstraintTablePlaceholder.propTypes = {
  message: PropTypes.string.isRequired,
}

export const ConstraintTableOrPlaceholder = connect(state => ({
  currentTranscript: currentTranscript(state),
  geneData: geneData(state).toJS(),
  selectedVariantDataset: selectedVariantDataset(state),
}))(({ currentTranscript, geneData, selectedVariantDataset }) => {
  if (selectedVariantDataset === 'exac') {
    const exacConstraint = geneData.exacv1_constraint
    if (!exacConstraint) {
      return <ConstraintTablePlaceholder message="ExAC constraint not available for this gene" />
    }
    return <ConstraintTable constraintData={exacConstraint} />
  }

  return <GnomadConstraintTable transcriptId={currentTranscript || geneData.canonical_transcript} />
})
