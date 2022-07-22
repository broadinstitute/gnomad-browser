import React from 'react'

import { BaseQuery } from '../Query'

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

type Props = {
  children: (...args: any[]) => any
  datasetId: string
  variantId: string
}

const MNVDetailsQuery = ({ children, datasetId, variantId }: Props) => (
  // @ts-expect-error TS(2769) FIXME: No overload matches this call.
  <BaseQuery query={query} variables={{ datasetId, variantId }}>
    {children}
  </BaseQuery>
)

export default MNVDetailsQuery
