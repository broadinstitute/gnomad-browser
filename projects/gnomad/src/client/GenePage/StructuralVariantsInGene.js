import React from 'react'

import { Query } from '../Query'
import StatusMessage from '../StatusMessage'
import StructuralVariants from '../StructuralVariantList/StructuralVariants'

const StructuralVariantsInGene = ({ gene, ...rest }) => {
  const query = `
    query StructuralVariantsInGene($geneId: String!) {
      gene(gene_id: $geneId) {
        structural_variants {
          ac
          ac_hom
          an
          af
          chrom
          end_chrom
          end_pos
          consequence
          filters
          length
          pos
          type
          variant_id
        }
      }
    }
  `

  return (
    <Query query={query} variables={{ geneId: gene.gene_id }}>
      {({ data, error, loading }) => {
        if (loading) {
          return <StatusMessage>Loading variants...</StatusMessage>
        }

        if (error || !data.gene || !data.gene.structural_variants) {
          return <StatusMessage>Failed to load variants</StatusMessage>
        }

        // const variants = data.variants
        //   .map(v => ({
        //     ...v,
        //     alts: v.alt,
        //     ac: v.ac.total,
        //     an: v.an.total,
        //     af: v.af.total,
        //     n_homalt: v.n_homalt.total,
        //     consequence: v.worst_consequence,
        //   }))
        //   .filter(v => v.consequence !== 'nearest_tss')

        return (
          <StructuralVariants
            {...rest}
            chrom={gene.chrom}
            variants={data.gene.structural_variants}
          />
        )
      }}
    </Query>
  )
}

export default StructuralVariantsInGene
