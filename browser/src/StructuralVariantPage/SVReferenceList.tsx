import React from 'react'

import { ExternalLink, List, ListItem } from '@gnomad/ui'

import { StructuralVariant } from './StructuralVariantPage'
import { DatasetId, usesGrch37 } from '@gnomad/dataset-metadata/metadata'


type SVUCSCLinksProps = {
  variant: StructuralVariant
  datasetId: DatasetId
}

const SVUCSCLinks = ({ variant, datasetId }: SVUCSCLinksProps) => {
  const ucscReferenceGenomeId = usesGrch37(datasetId) ? 'hg19' : 'hg38'
  const ucscUrl = (chrom: string, pos: number, end: number, ) =>
  `https://genome.ucsc.edu/cgi-bin/hgTracks?db=${ucscReferenceGenomeId}&position=chr${chrom}%3A${pos}-${end}`

  if (variant.type === 'INS') {
    return (
      // @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component.
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
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink
          href={ucscUrl(variant.chrom, Math.max(variant.pos - 5000, 0), variant.pos + 5000)}
        >
          position
        </ExternalLink>
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */},{' '}
        <ExternalLink
          // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
          href={ucscUrl(variant.chrom2, Math.max(variant.pos2 - 5000, 0), variant.pos2 + 5000)}
        >
          second position
        </ExternalLink>
      </React.Fragment>
    )
  }

  // @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component.
  return <ExternalLink href={ucscUrl(variant.chrom, variant.pos, variant.end)}>UCSC</ExternalLink>
}

type SVReferenceListProps = {
  variant: StructuralVariant
  datasetId: DatasetId
}

export const SVReferenceList = ({ variant, datasetId }: SVReferenceListProps) => (
  // @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
  <List>
    {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
    <ListItem>
      <SVUCSCLinks variant={variant} datasetId={datasetId} />
    </ListItem>
  </List>
)

export default SVReferenceList
