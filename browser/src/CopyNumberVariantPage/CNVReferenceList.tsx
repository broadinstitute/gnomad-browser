import React from 'react'

import { ExternalLink, List, ListItem } from '@gnomad/ui'

import { CopyNumberVariant } from './CopyNumberVariantPage'

const ucscUrl = (chrom: any, pos: any, end: any) =>
  `https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&position=chr${chrom}%3A${pos}-${end}`

type CNVUCSCLinksProps = {
  variant: CopyNumberVariant
}

const CNVUCSCLinks = ({ variant }: CNVUCSCLinksProps) => {
  return <ExternalLink href={ucscUrl(variant.chrom, variant.pos, variant.end)}>UCSC</ExternalLink>
}

type CNVReferenceListProps = {
  variant: CopyNumberVariant
}

const CNVReferenceList = ({ variant }: CNVReferenceListProps) => (
  <List>
    <ListItem>
      <CNVUCSCLinks variant={variant} />
    </ListItem>
  </List>
)

export default CNVReferenceList
