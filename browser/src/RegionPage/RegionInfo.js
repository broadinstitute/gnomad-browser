import React from 'react'
import PropTypes from 'prop-types'

import { ExternalLink } from '@gnomad/ui'

import AttributeList from '../AttributeList'

const RegionInfo = ({ region }) => {
  const { reference_genome: referenceGenome, chrom, start, stop } = region

  const ucscReferenceGenomeId = referenceGenome === 'GRCh37' ? 'hg19' : 'hg38'
  const ucscUrl = `https://genome.ucsc.edu/cgi-bin/hgTracks?db=${ucscReferenceGenomeId}&position=chr${chrom}%3A${start}-${stop}`

  return (
    <AttributeList style={{ marginTop: '1.25em' }}>
      <AttributeList.Item label="Genome build">
        {referenceGenome} / {ucscReferenceGenomeId}
      </AttributeList.Item>
      <AttributeList.Item label="Region size">
        {(stop - start + 1).toLocaleString()} BP
      </AttributeList.Item>
      <AttributeList.Item label="External resources">
        <ExternalLink href={ucscUrl}>UCSC Browser</ExternalLink>
      </AttributeList.Item>
    </AttributeList>
  )
}

RegionInfo.propTypes = {
  region: PropTypes.shape({
    reference_genome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
}

export default RegionInfo
