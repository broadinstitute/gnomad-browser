import PropTypes from 'prop-types'
import React from 'react'

import StatusMessage from '../../StatusMessage'
import ExacConstraintTable from './ExacConstraintTable'
import GnomadConstraintTable from './GnomadConstraintTable'

const GeneConstraint = ({ datasetId, gene, selectedTranscriptId }) => {
  if (datasetId === 'exac') {
    const exacConstraint = gene.exac_constraint
    if (!exacConstraint) {
      return <StatusMessage>Constraint not available for this gene</StatusMessage>
    }
    return <ExacConstraintTable constraint={exacConstraint} />
  }

  return (
    <React.Fragment>
      {['controls', 'non_neuro', 'non_cancer', 'non_topmed'].some(subset =>
        datasetId.includes(subset)
      ) && <p>Constraint is based on the full gnomAD dataset, not the selected subset.</p>}
      <GnomadConstraintTable transcriptId={selectedTranscriptId} />
    </React.Fragment>
  )
}

GeneConstraint.propTypes = {
  datasetId: PropTypes.string.isRequired,
  gene: PropTypes.shape({
    exac_constraint: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  }).isRequired,
  selectedTranscriptId: PropTypes.string.isRequired,
}

export default GeneConstraint
