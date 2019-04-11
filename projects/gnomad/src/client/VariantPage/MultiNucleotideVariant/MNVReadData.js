import PropTypes from 'prop-types'
import React from 'react'

import { GnomadReadData } from '../reads/GnomadReadData'

const MNVReadData = ({ variant }) => {
  // Concatenate reads from all constituent SNVs
  const exomeReads = variant.constituent_snvs.reduce((reads, snv) => {
    const categoryCount = { het: 0, hom: 0, hemi: 0 }
    const snvReads = (snv.exome || {}).reads || []
    return reads.concat(
      snvReads.map(read => ({
        ...read,
        label: `${snv.variant_id} ${read.category} [exome] #${++categoryCount[read.category]}`, // eslint-disable-line no-plusplus
      }))
    )
  }, [])

  const genomeReads = variant.constituent_snvs.reduce((reads, snv) => {
    const categoryCount = { het: 0, hom: 0, hemi: 0 }
    const snvReads = (snv.genome || {}).reads || []
    return reads.concat(
      snvReads.map(read => ({
        ...read,
        label: `${snv.variant_id} ${read.category} [genome] #${++categoryCount[read.category]}`, // eslint-disable-line no-plusplus
      }))
    )
  }, [])

  return (
    <GnomadReadData
      exomeReads={exomeReads}
      genomeReads={genomeReads}
      igvLocus={`${variant.chrom}:${variant.pos - 40}-${variant.pos + 40}`}
      showHemizygotes={variant.chrom === 'X' || variant.chrom === 'Y'}
    />
  )
}

MNVReadData.propTypes = {
  variant: PropTypes.shape({
    chrom: PropTypes.string.isRequired,
    pos: PropTypes.number.isRequired,
    constituent_snvs: PropTypes.arrayOf(
      PropTypes.shape({
        exome: PropTypes.shape({
          reads: PropTypes.arrayOf(
            PropTypes.shape({
              bamPath: PropTypes.string.isRequired,
              category: PropTypes.oneOf(['het', 'hom', 'hemi']).isRequired,
              indexPath: PropTypes.string.isRequired,
              readGroup: PropTypes.string.isRequired,
            })
          ),
        }),
        genome: PropTypes.shape({
          reads: PropTypes.arrayOf(
            PropTypes.shape({
              bamPath: PropTypes.string.isRequired,
              category: PropTypes.oneOf(['het', 'hom', 'hemi']).isRequired,
              indexPath: PropTypes.string.isRequired,
              readGroup: PropTypes.string.isRequired,
            })
          ),
        }),
      })
    ).isRequired,
  }).isRequired,
}

export default MNVReadData
