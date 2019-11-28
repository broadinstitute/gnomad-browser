import PropTypes from 'prop-types'
import React from 'react'

import Query from '../../Query'

const query = `
query MultiNucleotideVariant($variantId: String!, $datasetId: DatasetId!) {
  multiNucleotideVariant(variant_id: $variantId, dataset: $datasetId) {
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
    related_mnvs {
      combined_variant_id
      changes_amino_acids
      n_individuals
      other_constituent_snvs
    }
  }
}
`

const MNVDetailsQuery = ({ children, datasetId, variantId }) => (
  <Query query={query} variables={{ datasetId, variantId }}>
    {children}
  </Query>
)

MNVDetailsQuery.propTypes = {
  children: PropTypes.func.isRequired,
  datasetId: PropTypes.string.isRequired,
  variantId: PropTypes.string.isRequired,
}

export default MNVDetailsQuery
