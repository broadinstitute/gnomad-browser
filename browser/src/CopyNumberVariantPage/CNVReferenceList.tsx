import React from 'react'

import { ExternalLink, List, ListItem } from '@gnomad/ui'

import { CopyNumberVariant } from './CopyNumberVariantPage'

const ucscUrl = (chrom: any, pos: any, end: any) =>
  `https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&position=chr${chrom}%3A${pos}-${end}`

type CNVUCSCLinksProps = {
  variant: CopyNumberVariant
}

const CNVUCSCLinks = ({ variant }: CNVUCSCLinksProps) => {
  // @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component.
  return <ExternalLink href={ucscUrl(variant.chrom, variant.pos, variant.end)}>UCSC</ExternalLink>
}

type CNVReferenceListProps = {
  variant: CopyNumberVariant
}

const CNVReferenceList = ({ variant }: CNVReferenceListProps) => (
  // @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
  <List>
    {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
    <ListItem>
      <CNVUCSCLinks variant={variant} />
    </ListItem>
  </List>
)

export default CNVReferenceList
