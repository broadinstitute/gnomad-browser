import PropTypes from 'prop-types'
import React from 'react'

import { ExternalLink, List, ListItem } from '@broad/ui'

export const ReferenceList = ({ variant, clinvarVariant }) => {
  /* eslint-disable prettier/prettier */
  const dbsnpURL = `http://www.ncbi.nlm.nih.gov/projects/SNP/snp_ref.cgi?rs=${variant.rsid}`

  const ucscURL = `http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg19&highlight=hg19.chr${variant.chrom}%3A${variant.pos}-${variant.pos + (variant.ref.length - 1)}&position=chr${variant.chrom}%3A${variant.pos - 25}-${variant.pos + (variant.ref.length - 1) + 25}`
  /* eslint-enable prettier/prettier */

  return (
    <List>
      <ListItem>
        {variant.rsid && variant.rsid !== '.' ? (
          <ExternalLink href={dbsnpURL}>dbSNP ({variant.rsid})</ExternalLink>
        ) : (
          'Not found in dbSNP'
        )}
      </ListItem>
      <ListItem>
        <ExternalLink href={ucscURL}>UCSC</ExternalLink>
      </ListItem>
      {clinvarVariant && (
        <ListItem>
          <ExternalLink
            href={`http://www.ncbi.nlm.nih.gov/clinvar/?term=${clinvarVariant.allele_id}[alleleid]`}
          >
            ClinVar ({clinvarVariant.allele_id})
          </ExternalLink>
        </ListItem>
      )}
    </List>
  )
}

ReferenceList.propTypes = {
  variant: PropTypes.shape({
    chrom: PropTypes.string.isRequired,
    pos: PropTypes.number.isRequired,
    ref: PropTypes.string.isRequired,
    rsid: PropTypes.string,
  }).isRequired,
  clinvarVariant: PropTypes.shape({
    allele_id: PropTypes.number.isRequired,
  }),
}

ReferenceList.defaultProps = {
  clinvarVariant: undefined,
}
