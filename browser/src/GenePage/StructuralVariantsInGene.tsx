import React from 'react'

import { referenceGenomeForDataset } from '../datasets'
import Query from '../Query'
import { filterStructuralVariantsInZoomRegion } from '../RegionViewer/filterVariantsInZoomRegion'
import StructuralVariants from '../StructuralVariantList/StructuralVariants'

type OwnProps = {
  datasetId: string
  gene: {
    chrom: string
    gene_id: string
  }
  zoomRegion?: {
    start: number
    stop: number
  }
}

// @ts-expect-error TS(2456) FIXME: Type alias 'Props' circularly references itself.
type Props = OwnProps & typeof StructuralVariantsInGene.defaultProps

// @ts-expect-error TS(7022) FIXME: 'StructuralVariantsInGene' implicitly has type 'an... Remove this comment to see the full error message
const StructuralVariantsInGene = ({ datasetId, gene, zoomRegion, ...rest }: Props) => {
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
      success={(data: any) => data.gene && data.gene.structural_variants}
    >
      {({ data }: any) => {
        return (
          <StructuralVariants
            {...rest}
            context={gene}
            exportFileName={`gnomad_structural_variants_${gene.gene_id}`}
            variants={filterStructuralVariantsInZoomRegion(
              data.gene.structural_variants,
              zoomRegion
            )}
          />
        )
      }}
    </Query>
  )
}

StructuralVariantsInGene.defaultProps = {
  zoomRegion: null,
}

export default StructuralVariantsInGene
