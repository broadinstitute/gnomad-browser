import PropTypes from 'prop-types'
import React from 'react'

import { Query } from '../../Query'

const query = `
query MultiNucleotideVariant($variantId: String!) {
  multiNucleotideVariant(variantId: $variantId) {
    variantId
    chrom
    pos
    snv1 {
      variantId
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
    snv2 {
      variantId
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
    exome {
      ac
      acHom
      nIndividuals
    }
    genome {
      ac
      acHom
      nIndividuals
    }
    consequences {
      geneId
      geneSymbol
      transcriptId
      snv1 {
        aminoAcidChange
        codonChange
        consequence
      }
      snv2 {
        aminoAcidChange
        codonChange
        consequence
      }
      mnv {
        aminoAcidChange
        codonChange
        consequence
      }
      category
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
