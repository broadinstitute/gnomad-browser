import React from 'react'
import PropTypes from 'prop-types'

import { ExternalLink } from '@broad/ui'

import AttributeList from '../AttributeList'

const RegionInfo = ({ region }) => {
  const { chrom, start, stop } = region
  const ucscUrl = `http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg19&position=chr${chrom}%3A${start}-${stop}`

  return (
    <AttributeList labelWidth={120}>
      <AttributeList.Item label="Region size">
        {(stop - start + 1).toLocaleString()} BP
      </AttributeList.Item>
      <AttributeList.Item label="UCSC Browser">
        <ExternalLink href={ucscUrl}>{`${chrom}:${start}-${stop}`}</ExternalLink>
      </AttributeList.Item>
    </AttributeList>
  )
}

RegionInfo.propTypes = {
  region: PropTypes.shape({
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
}

export default RegionInfo
