import PropTypes from 'prop-types'
import React from 'react'

import { GnomadReadData } from '../reads/GnomadReadData'

const getReads = (snv, exomeOrGenome) => {
  const categoryCount = { het: 0, hom: 0, hemi: 0 }
  return ((snv[exomeOrGenome] || {}).reads || []).map(read => {
    const { category } = read
    categoryCount[category] += 1
    return {
      ...read,
      label: `${snv.variant_id} ${category} [${exomeOrGenome}] #${categoryCount[category]}`,
    }
  })
}

const interleaveReads = allReads => {
  let reads = []
  ;['het', 'hom', 'hemi'].forEach(category => {
    const allReadsInCategory = allReads.map(snvReads =>
      snvReads.filter(read => read.category === category)
    )
    while (allReadsInCategory.some(snvReads => snvReads.length)) {
      reads = reads.concat(
        allReadsInCategory.map(snvReads => snvReads.shift()).filter(read => read !== undefined)
      )
    }
  })
  return reads
}

const MNVReadData = ({ variant }) => {
  // Concatenate reads from all constituent SNVs
  const exomeReads = interleaveReads(variant.constituent_snvs.map(snv => getReads(snv, 'exome')))
  const genomeReads = interleaveReads(variant.constituent_snvs.map(snv => getReads(snv, 'genome')))

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
