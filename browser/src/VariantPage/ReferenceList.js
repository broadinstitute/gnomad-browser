import PropTypes from 'prop-types'
import React from 'react'

import { ExternalLink, List, ListItem } from '@gnomad/ui'

import { BaseQuery } from '../Query'

const clinvarVariantQuery = `
query ClinvarVariant($variantId: String!, $referenceGenome: ReferenceGenomeId!) {
  clinvar_variant(variant_id: $variantId, reference_genome: $referenceGenome) {
    clinvar_variation_id
  }
}
`

export const ReferenceList = ({ variant }) => {
  const ucscReferenceGenomeId = variant.reference_genome === 'GRCh37' ? 'hg19' : 'hg38'
  const { chrom, pos, ref } = variant
  const ucscURL = `https://genome.ucsc.edu/cgi-bin/hgTracks?db=${ucscReferenceGenomeId}&highlight=${ucscReferenceGenomeId}.chr${chrom}%3A${pos}-${
    pos + (ref.length - 1)
  }&position=chr${chrom}%3A${pos - 25}-${pos + (ref.length - 1) + 25}`

  return (
    <List>
      {variant.rsid && (
        <ListItem>
          <ExternalLink
            href={`https://www.ncbi.nlm.nih.gov/projects/SNP/snp_ref.cgi?rs=${variant.rsid}`}
          >
            dbSNP ({variant.rsid})
          </ExternalLink>
        </ListItem>
      )}
      <ListItem>
        <ExternalLink href={ucscURL}>UCSC</ExternalLink>
      </ListItem>
      <BaseQuery
        query={clinvarVariantQuery}
        variables={{ variantId: variant.variant_id, referenceGenome: variant.reference_genome }}
      >
        {({ data, error, loading }) => {
          if (loading || error || !data.clinvar_variant) {
            return null
          }

          return (
            <ListItem>
              <ExternalLink
                href={`https://www.ncbi.nlm.nih.gov/clinvar/variation/${data.clinvar_variant.clinvar_variation_id}/`}
              >
                ClinVar ({data.clinvar_variant.clinvar_variation_id})
              </ExternalLink>
            </ListItem>
          )
        }}
      </BaseQuery>
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
    rsid: PropTypes.string,
  }).isRequired,
}
