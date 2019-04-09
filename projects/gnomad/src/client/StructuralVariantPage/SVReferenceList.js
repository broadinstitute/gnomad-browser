import PropTypes from 'prop-types'
import React from 'react'

import { ExternalLink, List, ListItem } from '@broad/ui'

import StructuralVariantDetailPropType from './StructuralVariantDetailPropType'

const SVUCSCLink = ({ chrom, pos, endPos }) => {
  let start = pos
  let stop = endPos

  if (endPos === undefined) {
    start = Math.max(start - 5000, 0)
    stop = start + 5000
  }

  const url = `http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg19&position=chr${chrom}%3A${start}-${stop}`

  return (
    <ExternalLink href={url}>
      {chrom}:{start}-{stop}
    </ExternalLink>
  )
}

SVUCSCLink.propTypes = {
  chrom: PropTypes.string.isRequired,
  pos: PropTypes.number.isRequired,
  endPos: PropTypes.number,
}

SVUCSCLink.defaultProps = {
  endPos: undefined,
}

const SVUCSCLinks = ({ variant }) => {
  if (variant.type === 'INS') {
    return <SVUCSCLink chrom={variant.chrom} pos={variant.pos} />
  }

  if (variant.type === 'BND' || variant.type === 'CTX' || variant.chrom !== variant.end_chrom) {
    return (
      <React.Fragment>
        <SVUCSCLink chrom={variant.chrom} pos={variant.pos} /> |{' '}
        <SVUCSCLink chrom={variant.end_chrom} pos={variant.end_pos} />
      </React.Fragment>
    )
  }

  return <SVUCSCLink chrom={variant.chrom} pos={variant.pos} endPos={variant.end_pos} />
}

SVUCSCLinks.propTypes = {
  variant: StructuralVariantDetailPropType.isRequired,
}

const SVReferenceList = ({ variant }) => (
  <List>
    <ListItem>
      UCSC: <SVUCSCLinks variant={variant} />
    </ListItem>
  </List>
)

SVReferenceList.propTypes = {
  variant: StructuralVariantDetailPropType.isRequired,
}

export default SVReferenceList
