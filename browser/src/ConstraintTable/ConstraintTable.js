import PropTypes from 'prop-types'
import React from 'react'

import ExacConstraintTable from './ExacConstraintTable'
import GnomadConstraintTable from './GnomadConstraintTable'

const ConstraintTable = ({ datasetId, geneOrTranscript }) => {
  if (datasetId.startsWith('gnomad_r3')) {
    return <p>Constraint not yet available for gnomAD v3.</p>
  }

  const isTranscript = geneOrTranscript.transcript_id !== undefined

  const gnomadConstraint = geneOrTranscript.gnomad_constraint
  const exacConstraint = geneOrTranscript.exac_constraint

  if (datasetId === 'exac') {
    if (!exacConstraint) {
      return <p>Constraint not available for this {isTranscript ? 'transcript' : 'gene'}</p>
    }
    return <ExacConstraintTable constraint={exacConstraint} />
  }

  if (!gnomadConstraint) {
    return <p>Constraint not available for this {isTranscript ? 'transcript' : 'gene'}</p>
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
  geneOrTranscript: PropTypes.shape({
    transcript_id: PropTypes.string,
    /* eslint-disable react/forbid-prop-types */
    gnomad_constraint: PropTypes.object,
    exac_constraint: PropTypes.object,
    /* eslint-enable react/forbid-prop-types */
  }).isRequired,
}

export default ConstraintTable
