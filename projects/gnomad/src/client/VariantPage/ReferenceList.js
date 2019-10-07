import PropTypes from 'prop-types'
import React from 'react'

import { ExternalLink, List, ListItem } from '@broad/ui'

export const ReferenceList = ({ variant, clinvarVariant }) => {
  const dbsnpURL = `http://www.ncbi.nlm.nih.gov/projects/SNP/snp_ref.cgi?rs=${variant.rsid}`

  const ucscReferenceGenomeId = variant.reference_genome === 'GRCh37' ? 'hg19' : 'hg38'
  const { chrom, pos, ref } = variant
  /* eslint-disable-next-line prettier/prettier */
  const ucscURL = `http://genome.ucsc.edu/cgi-bin/hgTracks?db=${ucscReferenceGenomeId}&highlight=${ucscReferenceGenomeId}.chr${chrom}%3A${pos}-${pos + (ref.length - 1)}&position=chr${chrom}%3A${pos - 25}-${pos + (ref.length - 1) + 25}`

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
    reference_genome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
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
