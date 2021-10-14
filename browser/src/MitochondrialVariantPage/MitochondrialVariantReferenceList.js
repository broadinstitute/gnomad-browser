import React from 'react'

import { ExternalLink, List, ListItem } from '@gnomad/ui'

import MitochondrialVariantDetailPropType from './MitochondrialVariantDetailPropType'

const MitochondrialVariantReferenceList = ({ variant }) => {
  const { pos, ref, alt } = variant
  /* eslint-disable-next-line prettier/prettier */
  const ucscURL = `https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&highlight=hg38.chrM%3A${pos}-${pos + (ref.length - 1)}&position=chrM%3A${pos - 25}-${pos + (ref.length - 1) + 25}`

  const mitomapURL = `https://mitomap.org/cgi-bin/search_allele?variant=${encodeURIComponent(
    `${pos}${ref}>${alt}`
  )}`

  const mseqdrURL = `https://mseqdr.org/variant.php?variant=M-${pos}-${ref}-${alt}&dataset=gnomad_r3`

  return (
    <List>
      {(variant.rsids || []).length === 1 && (
        <ListItem>
          <ExternalLink
            href={`https://www.ncbi.nlm.nih.gov/projects/SNP/snp_ref.cgi?rs=${variant.rsids[0]}`}
          >
            dbSNP ({variant.rsids[0]})
          </ExternalLink>
        </ListItem>
      )}
      {(variant.rsids || []).length > 1 && (
        <ListItem>
          dbSNP (
          {variant.rsids
            .map(rsid => (
              <ExternalLink
                key={rsid}
                href={`https://www.ncbi.nlm.nih.gov/projects/SNP/snp_ref.cgi?rs=${rsid}`}
              >
                {rsid}
              </ExternalLink>
            ))
            .reduce((acc, el) => [...acc, ', ', el], [])
            .slice(1)}
          )
        </ListItem>
      )}
      <ListItem>
        <ExternalLink href={ucscURL}>UCSC</ExternalLink>
      </ListItem>
      <ListItem>
        <ExternalLink href={mitomapURL}>Mitomap</ExternalLink>
      </ListItem>
      <ListItem>
        <ExternalLink href={mseqdrURL}>MSeqDR</ExternalLink>
      </ListItem>
      {/* Show MitoVisualize links only for RNA gene variants */}
      {(variant.transcript_consequences || []).some(
        csq => csq.gene_symbol.startsWith('MT-T') || csq.gene_symbol.startsWith('MT-R')
      ) && (
        <ListItem>
          <ExternalLink href={`https://www.mitovisualize.org/variant/${variant.variant_id}`}>
            MitoVisualize
          </ExternalLink>
        </ListItem>
      )}
      {variant.clinvar && (
        <ListItem>
          <ExternalLink
            href={`https://www.ncbi.nlm.nih.gov/clinvar/variation/${variant.clinvar.clinvar_variation_id}/`}
          >
            ClinVar ({variant.clinvar.clinvar_variation_id})
          </ExternalLink>
        </ListItem>
      )}
    </List>
  )
}

MitochondrialVariantReferenceList.propTypes = {
  variant: MitochondrialVariantDetailPropType.isRequired,
}

export default MitochondrialVariantReferenceList
