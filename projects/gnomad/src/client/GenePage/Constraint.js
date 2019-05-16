import PropTypes from 'prop-types'
import React from 'react'

import { BaseTable } from '@broad/ui'

import GnomadConstraintTable, { renderRoundedNumber } from './GnomadConstraintTable'

const ConstraintTable = ({ constraintData }) => (
  <BaseTable>
    <thead>
      <tr>
        <th scope="col">Category</th>
        <th scope="col">Exp. SNVs</th>
        <th scope="col">Obs. SNVs</th>
        <th scope="col">Constraint metric</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th scope="row">Synonymous</th>
        <td>{renderRoundedNumber(constraintData.exp_syn)}</td>
        <td>{constraintData.n_syn}</td>
        <td>
          Z ={' '}
          {renderRoundedNumber(
            constraintData.syn_z,
            2,
            3,
            constraintData.syn_z > 3.71 && '#ff2600'
          )}
        </td>
      </tr>
      <tr>
        <th scope="row">Missense</th>
        <td>{renderRoundedNumber(constraintData.exp_mis)}</td>
        <td>{constraintData.n_mis}</td>
        <td>
          Z ={' '}
          {renderRoundedNumber(
            constraintData.mis_z,
            2,
            3,
            constraintData.mis_z > 3.09 && '#ff9300'
          )}
        </td>
      </tr>
      <tr>
        <th scope="row">LoF</th>
        <td>{renderRoundedNumber(constraintData.exp_lof)}</td>
        <td>{constraintData.n_lof}</td>
        <td>
          pLI ={' '}
          {renderRoundedNumber(constraintData.pLI, 2, 3, constraintData.pLI > 0.9 && '#ff9300')}
        </td>
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
        <th scope="col">Exp. no. SNVs</th>
        <th scope="col">Obs. no. SNVs</th>
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

export const ConstraintTableOrPlaceholder = ({ datasetId, gene, selectedTranscriptId }) => {
  if (datasetId === 'exac') {
    const exacConstraint = gene.exacv1_constraint
    if (!exacConstraint) {
      return <ConstraintTablePlaceholder message="ExAC constraint not available for this gene" />
    }
    return <ConstraintTable constraintData={exacConstraint} />
  }

  return <GnomadConstraintTable transcriptId={selectedTranscriptId} />
}

ConstraintTableOrPlaceholder.propTypes = {
  datasetId: PropTypes.string.isRequired,
  gene: PropTypes.shape({
    exacv1_constraint: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  }).isRequired,
  selectedTranscriptId: PropTypes.string.isRequired,
}
