import React from 'react'

import { ExternalLink, List, ListItem } from '@gnomad/ui'
import { NcbiReference, ClinvarReference } from '../VariantPage/ReferenceList'

import { MitochondrialVariant } from './MitochondrialVariantPage'

type Props = {
  variant: MitochondrialVariant
}

const MitochondrialVariantReferenceList = ({ variant }: Props) => {
  const { pos, ref, alt } = variant

  const ucscURL = `https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&highlight=hg38.chrM%3A${pos}-${
    pos + (ref.length - 1)
  }&position=chrM%3A${pos - 25}-${pos + (ref.length - 1) + 25}`

  const mitomapURL = `https://mitomap.org/cgi-bin/search_allele?variant=${encodeURIComponent(
    `${pos}${ref}>${alt}`
  )}`

  const mseqdrURL = `https://mseqdr.org/variant.php?variant=M-${pos}-${ref}-${alt}&dataset=gnomad_r3`

  return (
    // @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
    <List>
      {variant.rsids && NcbiReference(variant.rsids)}
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <ListItem>
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href={ucscURL}>UCSC</ExternalLink>
      </ListItem>
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <ListItem>
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href={mitomapURL}>Mitomap</ExternalLink>
      </ListItem>
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <ListItem>
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href={mseqdrURL}>MSeqDR</ExternalLink>
      </ListItem>
      {/* Show MitoVisualize links only for RNA gene variants */}
      {(variant.transcript_consequences || []).some(
        (csq: any) => csq.gene_symbol.startsWith('MT-T') || csq.gene_symbol.startsWith('MT-R')
      ) && (
        // @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
        <ListItem>
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href={`https://www.mitovisualize.org/variant/${variant.variant_id}`}>
            MitoVisualize
          </ExternalLink>
        </ListItem>
      )}
      {variant.clinvar && ClinvarReference(variant.clinvar.clinvar_variation_id)}
    </List>
  )
}

export default MitochondrialVariantReferenceList
