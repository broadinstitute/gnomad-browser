import React from 'react'

import { ExternalLink, List, ListItem } from '@gnomad/ui'

type Props = {
  variant: {
    variant_id: string
    reference_genome: 'GRCh37' | 'GRCh38'
    chrom: string
    pos: number
    ref: string
    caid?: string
    rsids?: string[]
    clinvar?: {
      clinvar_variation_id: string
    }
  }
}

export const ReferenceList = ({ variant }: Props) => {
  const ucscReferenceGenomeId = variant.reference_genome === 'GRCh37' ? 'hg19' : 'hg38'
  const { chrom, pos, ref } = variant
  const ucscURL = `https://genome.ucsc.edu/cgi-bin/hgTracks?db=${ucscReferenceGenomeId}&highlight=${ucscReferenceGenomeId}.chr${chrom}%3A${pos}-${
    pos + (ref.length - 1)
  }&position=chr${chrom}%3A${pos - 25}-${pos + (ref.length - 1) + 25}`

  return (
    // @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
    <List>
      {(variant.rsids || []).length === 1 && (
        // @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
        <ListItem>
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <ExternalLink
            // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
            href={`https://www.ncbi.nlm.nih.gov/projects/SNP/snp_ref.cgi?rs=${variant.rsids[0]}`}
          >
            {/* @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'. */}
            dbSNP ({variant.rsids[0]})
          </ExternalLink>
        </ListItem>
      )}
      {(variant.rsids || []).length > 1 && (
        // @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
        <ListItem>
          dbSNP ({' '}
          {
            // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
            (variant.rsids
              .map((rsid) => (
                // @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component.
                <ExternalLink
                  key={rsid}
                  href={`https://www.ncbi.nlm.nih.gov/projects/SNP/snp_ref.cgi?rs=${rsid}`}
                >
                  {rsid}
                </ExternalLink>
              ))
              // @ts-expect-error TS(2769) FIXME: No overload matches this call.
              .reduce((acc, el) => [...acc, ', ', el], []) as any).slice(1)
          }
          )
        </ListItem>
      )}
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <ListItem>
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href={ucscURL}>UCSC</ExternalLink>
      </ListItem>
      {variant.clinvar && (
        // @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
        <ListItem>
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <ExternalLink
            href={`https://www.ncbi.nlm.nih.gov/clinvar/variation/${variant.clinvar.clinvar_variation_id}/`}
          >
            ClinVar ({variant.clinvar.clinvar_variation_id})
          </ExternalLink>
        </ListItem>
      )}
      {variant.caid && (
        // @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
        <ListItem>
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <ExternalLink
            href={`https://reg.clinicalgenome.org/redmine/projects/registry/genboree_registry/by_canonicalid?canonicalid=${variant.caid}`}
          >
            ClinGen Allele Registry ({variant.caid})
          </ExternalLink>
        </ListItem>
      )}
    </List>
  )
}
