import PropTypes from 'prop-types'
import React from 'react'

import { referenceGenomeForDataset } from '../datasets'
import Query from '../Query'
import StructuralVariants from '../StructuralVariantList/StructuralVariants'

const StructuralVariantsInGene = ({ datasetId, gene, visibleRegions, ...rest }) => {
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
      loadingMessage="Loading variants"
      errorMessage="Unable to load variants"
      success={data => data.gene && data.gene.structural_variants}
    >
      {({ data }) => {
        return (
          <StructuralVariants
            {...rest}
            context={gene}
            exportFileName={`gnomad_structural_variants_${gene.gene_id}`}
            variants={data.gene.structural_variants.filter(variant =>
              visibleRegions.some(
                ({ start, stop }) =>
                  (variant.pos <= stop && variant.end >= start) ||
                  (variant.pos2 <= stop && variant.end2 >= start)
              )
            )}
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
  visibleRegions: PropTypes.arrayOf(
    PropTypes.shape({ start: PropTypes.number.isRequired, stop: PropTypes.number.isRequired })
  ).isRequired,
}

export default StructuralVariantsInGene
