import React from 'react'

import { ExternalLink, List, ListItem } from '@broad/ui'

import StructuralVariantDetailPropType from './StructuralVariantDetailPropType'

const ucscUrl = (chrom, pos, end) =>
  `http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg19&position=chr${chrom}%3A${pos}-${end}`

const SVUCSCLinks = ({ variant }) => {
  if (variant.type === 'INS') {
    return (
      <ExternalLink
        href={ucscUrl(variant.chrom, Math.max(variant.pos - 5000, 0), variant.pos + 5000)}
      >
        UCSC
      </ExternalLink>
    )
  }

  if (variant.type === 'BND' || variant.type === 'CTX') {
    return (
      <React.Fragment>
        UCSC{' '}
        <ExternalLink
          href={ucscUrl(variant.chrom, Math.max(variant.pos - 5000, 0), variant.pos + 5000)}
        >
          position
        </ExternalLink>
        ,{' '}
        <ExternalLink
          href={ucscUrl(variant.chrom2, Math.max(variant.pos2 - 5000, 0), variant.pos2 + 5000)}
        >
          second position
        </ExternalLink>
      </React.Fragment>
    )
  }

  return <ExternalLink href={ucscUrl(variant.chrom, variant.pos, variant.end)}>UCSC</ExternalLink>
}

SVUCSCLinks.propTypes = {
  variant: StructuralVariantDetailPropType.isRequired,
}

const SVReferenceList = ({ variant }) => (
  <List>
    <ListItem>
      <SVUCSCLinks variant={variant} />
    </ListItem>
  </List>
)

SVReferenceList.propTypes = {
  variant: StructuralVariantDetailPropType.isRequired,
}

export default SVReferenceList
