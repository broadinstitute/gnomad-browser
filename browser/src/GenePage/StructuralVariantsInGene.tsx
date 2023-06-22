import React from 'react'

import { referenceGenome } from '@gnomad/dataset-metadata/metadata'
import Query from '../Query'
import { filterStructuralVariantsInZoomRegion } from '../RegionViewer/filterVariantsInZoomRegion'
import StructuralVariants from '../StructuralVariantList/StructuralVariants'
import { StructuralVariant } from '../StructuralVariantPage/StructuralVariantPage'

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
  const operationName = 'StructuralVariantsInGene'
  const query = `
    query ${operationName}($datasetId: StructuralVariantDatasetId!, $geneId: String!, $referenceGenome: ReferenceGenomeId!) {
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
      operationName={operationName}
      query={query}
      variables={{
        datasetId,
        geneId: gene.gene_id,
        referenceGenome: referenceGenome(datasetId),
      }}
      loadingMessage="Loading variants"
      errorMessage="Unable to load variants"
      success={(data: any) => data.gene && data.gene.structural_variants}
    >
      {({ data }: any) => {
        const structural_variants = filterStructuralVariantsInZoomRegion(
          data.gene.structural_variants,
          zoomRegion
        ).map((variant: StructuralVariant) => ({
          ...variant,
          variant_id: variant.variant_id.toUpperCase(),
        }))

        return (
          <StructuralVariants
            {...rest}
            context={gene}
            exportFileName={`gnomad_structural_variants_${gene.gene_id}`}
            variants={structural_variants}
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
