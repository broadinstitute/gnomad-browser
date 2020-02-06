import PropTypes from 'prop-types'
import React from 'react'

import { Badge } from '@broad/ui'

import { labelForDataset } from '../datasets'
import sampleCounts from '../dataset-constants/sampleCounts'

const LowAlleleNumberWarning = ({ datasetId, variant }) => {
  // Display a warning if a variant's AN is < 50% of the max AN for exomes/genomes.
  // Max AN is 2 * sample count, so 50% max AN is equal to sample count.
  const { exomesTotal, genomesTotal } = sampleCounts[datasetId]
  const hasLowAlleleNumberInExomes = variant.exome && variant.exome.an < exomesTotal
  const hasLowAlleleNumberInGenomes = variant.genome && variant.genome.an < genomesTotal

  if (!(hasLowAlleleNumberInExomes || hasLowAlleleNumberInGenomes)) {
    return null
  }

  let sampleSet = null
  if (hasLowAlleleNumberInGenomes) {
    sampleSet = hasLowAlleleNumberInExomes ? 'exomes and genomes' : 'genomes'
  } else if (hasLowAlleleNumberInExomes) {
    sampleSet = 'exomes'
  }

  const noticeLevel = hasLowAlleleNumberInGenomes ? 'error' : 'warning'

  return (
    <p>
      <Badge level={noticeLevel}>Warning</Badge> This variant is covered in fewer than 50% of
      individuals in {labelForDataset(datasetId)} {sampleSet}. This may indicate a low-quality site.
    </p>
  )
}

LowAlleleNumberWarning.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variant: PropTypes.shape({
    exome: PropTypes.shape({
      an: PropTypes.number.isRequired,
    }),
    genome: PropTypes.shape({
      an: PropTypes.number.isRequired,
    }),
  }).isRequired,
}

export default LowAlleleNumberWarning
