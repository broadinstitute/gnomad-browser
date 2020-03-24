import PropTypes from 'prop-types'
import React from 'react'

import { TranscriptConsequenceList } from './TranscriptConsequenceList'
import TranscriptConsequencePropType from './TranscriptConsequencePropType'

const VariantTranscriptConsequences = ({ variant }) => {
  const { sortedTranscriptConsequences } = variant
  const numTranscripts = sortedTranscriptConsequences.length
  const geneIds = new Set(sortedTranscriptConsequences.map(csq => csq.gene_id))
  const numGenes = geneIds.size

  return (
    <div>
      <p>
        This variant falls on {numTranscripts} transcript{numTranscripts !== 1 && 's'} in {numGenes}{' '}
        gene{numGenes !== 1 && 's'}.
      </p>
      <TranscriptConsequenceList sortedTranscriptConsequences={sortedTranscriptConsequences} />
    </div>
  )
}

VariantTranscriptConsequences.propTypes = {
  variant: PropTypes.shape({
    sortedTranscriptConsequences: PropTypes.arrayOf(TranscriptConsequencePropType).isRequired,
  }).isRequired,
}

export default VariantTranscriptConsequences
