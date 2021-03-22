import PropTypes from 'prop-types'
import React from 'react'

import { ExternalLink, List, ListItem } from '@gnomad/ui'

export const ReferenceList = ({ variant }) => {
  const ucscReferenceGenomeId = variant.reference_genome === 'GRCh37' ? 'hg19' : 'hg38'
  const { chrom, pos, ref } = variant
  const ucscURL = `https://genome.ucsc.edu/cgi-bin/hgTracks?db=${ucscReferenceGenomeId}&highlight=${ucscReferenceGenomeId}.chr${chrom}%3A${pos}-${
    pos + (ref.length - 1)
  }&position=chr${chrom}%3A${pos - 25}-${pos + (ref.length - 1) + 25}`

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

ReferenceList.propTypes = {
  variant: PropTypes.shape({
    variant_id: PropTypes.string.isRequired,
    reference_genome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
    chrom: PropTypes.string.isRequired,
    pos: PropTypes.number.isRequired,
    ref: PropTypes.string.isRequired,
    rsids: PropTypes.arrayOf(PropTypes.string),
    clinvar: PropTypes.shape({
      clinvar_variation_id: PropTypes.string.isRequired,
    }),
  }).isRequired,
}
