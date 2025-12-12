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

export const NcbiReference = (variantRsids: string[]) => {
  return (
    <>
      {variantRsids.length === 1 && (
        <ListItem>
          <ExternalLink href={`http://www.ncbi.nlm.nih.gov/snp/${variantRsids[0]}`}>
            dbSNP ({variantRsids[0]})
          </ExternalLink>
        </ListItem>
      )}
      {variantRsids.length > 1 && (
        <ListItem>
          dbSNP ({' '}
          {(
            variantRsids
              .map((rsid) => (
                <ExternalLink key={rsid} href={`https://www.ncbi.nlm.nih.gov/snp/${rsid}`}>
                  {rsid}
                </ExternalLink>
              ))
              // @ts-expect-error TS(2769) FIXME: No overload matches this call.
              .reduce((acc, el) => [...acc, ', ', el], []) as any
          ).slice(1)}
          )
        </ListItem>
      )}
    </>
  )
}

export const ClinvarReference = (variantClinvarVariationId: string) => {
  return (
    <ListItem>
      <ExternalLink
        href={`https://www.ncbi.nlm.nih.gov/clinvar/variation/${variantClinvarVariationId}/`}
      >
        ClinVar ({variantClinvarVariationId})
      </ExternalLink>
    </ListItem>
  )
}

export const ReferenceList = ({ variant }: Props) => {
  const ucscReferenceGenomeId = variant.reference_genome === 'GRCh37' ? 'hg19' : 'hg38'
  const { chrom, pos, ref } = variant
  const ucscURL = `https://genome.ucsc.edu/cgi-bin/hgTracks?db=${ucscReferenceGenomeId}&highlight=${ucscReferenceGenomeId}.chr${chrom}%3A${pos}-${
    pos + (ref.length - 1)
  }&position=chr${chrom}%3A${pos - 25}-${pos + (ref.length - 1) + 25}`
  const allOfUsURL = `https://databrowser.researchallofus.org/snvsindels/${variant.variant_id}`

  return (
    <List>
      {variant.rsids && NcbiReference(variant.rsids)}

      <ListItem>
        <ExternalLink href={ucscURL}>UCSC</ExternalLink>
      </ListItem>

      {variant.clinvar && ClinvarReference(variant.clinvar.clinvar_variation_id)}

      {variant.caid && (
        <ListItem>
          <ExternalLink
            href={`https://reg.clinicalgenome.org/redmine/projects/registry/genboree_registry/by_canonicalid?canonicalid=${variant.caid}`}
          >
            ClinGen Allele Registry ({variant.caid})
          </ExternalLink>
        </ListItem>
      )}

      {variant.reference_genome === 'GRCh38' && (
        <ListItem>
          <ExternalLink href={allOfUsURL}>All of Us</ExternalLink>
        </ListItem>
      )}
    </List>
  )
}
