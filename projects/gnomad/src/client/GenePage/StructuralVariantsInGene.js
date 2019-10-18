import PropTypes from 'prop-types'
import React from 'react'

import { referenceGenomeForDataset } from '../datasets'
import Query from '../Query'
import StatusMessage from '../StatusMessage'
import StructuralVariants from '../StructuralVariantList/StructuralVariants'

const StructuralVariantsInGene = ({ datasetId, gene, ...rest }) => {
  const query = `
    query StructuralVariantsInGene($datasetId: StructuralVariantDatasetId!, $geneId: String!, $referenceGenome: ReferenceGenomeId!) {
      gene(gene_id: $geneId, reference_genome: $referenceGenome) {
        structural_variants(dataset: $datasetId) {
          ac
          ac_hom
          an
          af
          chrom
          chrom2
          end
          end2
          consequence
          filters
          length
          pos
          pos2
          type
          variant_id
        }
      }
    }
  `

  return (
    <Query
      query={query}
      variables={{
        datasetId,
        geneId: gene.gene_id,
        referenceGenome: referenceGenomeForDataset(datasetId),
      }}
    >
      {({ data, error, loading }) => {
        if (loading) {
          return <StatusMessage>Loading variants...</StatusMessage>
        }

        if (error || !((data || {}).gene || {}).structural_variants) {
          return <StatusMessage>Failed to load variants</StatusMessage>
        }

        return (
          <StructuralVariants
            {...rest}
            chrom={gene.chrom}
            exportFileName={`gnomad_structural_variants_${gene.gene_id}`}
            variants={data.gene.structural_variants}
          />
        )
      }}
    </Query>
  )
}

StructuralVariantsInGene.propTypes = {
  datasetId: PropTypes.string.isRequired,
  gene: PropTypes.shape({
    chrom: PropTypes.string.isRequired,
    gene_id: PropTypes.string.isRequired,
  }).isRequired,
}

export default StructuralVariantsInGene
