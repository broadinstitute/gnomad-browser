import PropTypes from 'prop-types'
import React from 'react'

import StatusMessage from '../StatusMessage'
import ExacConstraintTable from './ExacConstraintTable'
import GnomadConstraintTable from './GnomadConstraintTable'

const ConstraintTable = ({ datasetId, geneOrTranscript }) => {
  if (datasetId.startsWith('gnomad_r3')) {
    return <p>Constraint not yet available for gnomAD v3.</p>
  }

  const isTranscript = geneOrTranscript.transcript_id !== undefined

  const gnomadConstraint = geneOrTranscript.gnomad_constraint
  const exacConstraint = isTranscript
    ? geneOrTranscript.gene.exac_constraint
    : geneOrTranscript.exac_constraint

  if (datasetId === 'exac') {
    if (!exacConstraint) {
      return <StatusMessage>Constraint not available for this gene</StatusMessage>
    }
    return <ExacConstraintTable constraint={exacConstraint} />
  }

  if (!gnomadConstraint) {
    return (
      <StatusMessage>
        Constraint not available for this {isTranscript ? 'transcript' : 'gene'}
      </StatusMessage>
    )
  }

  return (
    <React.Fragment>
      {['controls', 'non_neuro', 'non_cancer', 'non_topmed'].some(subset =>
        datasetId.includes(subset)
      ) && <p>Constraint is based on the full gnomAD dataset, not the selected subset.</p>}
      <GnomadConstraintTable constraint={gnomadConstraint} />
    </React.Fragment>
  )
}

ConstraintTable.propTypes = {
  datasetId: PropTypes.string.isRequired,
  /* eslint-disable react/forbid-prop-types */
  geneOrTranscript: PropTypes.oneOfType([
    PropTypes.shape({
      gnomad_constraint: PropTypes.object,
      exac_constraint: PropTypes.object,
    }),
    PropTypes.shape({
      gnomad_constraint: PropTypes.object,
      gene: PropTypes.shape({
        exac_constraint: PropTypes.object,
      }),
    }),
  ]).isRequired,
  /* eslint-enable react/forbid-prop-types */
}

export default ConstraintTable
