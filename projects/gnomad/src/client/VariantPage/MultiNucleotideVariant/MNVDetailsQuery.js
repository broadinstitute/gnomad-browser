import PropTypes from 'prop-types'
import React from 'react'

import { Query } from '../../Query'

const query = `
query MultiNucleotideVariant($variantId: String!) {
  multiNucleotideVariant(variantId: $variantId) {
    variant_id
    chrom
    pos
    ref
    alt
    exome {
      ac
      ac_hom
      n_individuals
    }
    genome {
      ac
      ac_hom
      n_individuals
    }
    constituent_snvs {
      variant_id
      exome {
        ac
        an
        filters
      }
      genome {
        ac
        an
        filters
      }
    }
    consequences {
      gene_id
      gene_name
      transcript_id
      category
      consequence
      codons
      amino_acids
      snv_consequences {
        variant_id
        consequence
        codons
        amino_acids
      }
    }
  }
}
`

const MNVDetailsQuery = ({ children, variantId }) => (
  <Query query={query} variables={{ variantId }}>
    {children}
  </Query>
)

MNVDetailsQuery.propTypes = {
  children: PropTypes.func.isRequired,
  variantId: PropTypes.string.isRequired,
}

export default MNVDetailsQuery
