import React from 'react'

import { referenceGenome } from '@gnomad/dataset-metadata/metadata'
import Query from '../Query'
import { filterCopyNumberVariantsInZoomRegion } from '../RegionViewer/filterVariantsInZoomRegion'
import CopyNumberVariants from '../CopyNumberVariantList/CopyNumberVariants'
import { CopyNumberVariant } from '../CopyNumberVariantPage/CopyNumberVariantPage'

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
type Props = OwnProps & typeof CopyNumberVariantsInGene.defaultProps

// @ts-expect-error TS(7022) FIXME: 'CopyNumberVariantsInGene' implicitly has type 'an... Remove this comment to see the full error message
const CopyNumberVariantsInGene = ({ datasetId, gene, zoomRegion, ...rest }: Props) => {
  const operationName = 'CopyNumberVariantsInGene'
  const query = `
    query ${operationName}($datasetId: CopyNumberVariantDatasetId!, $geneId: String!, $referenceGenome: ReferenceGenomeId!) {
      gene(gene_id: $geneId, reference_genome: $referenceGenome) {
        copy_number_variants(dataset: $datasetId) {
          sc
          sn
          sf
          chrom
          end
          filters
          length
          pos
          posmin
          posmax
          endmin
          endmax
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
      success={(data: any) => data.gene && data.gene.copy_number_variants}
    >
      {({ data }: any) => {
        const copy_number_variants = filterCopyNumberVariantsInZoomRegion(
          data.gene.copy_number_variants,
          zoomRegion
        ).map((variant: CopyNumberVariant) => ({
          ...variant,
          variant_id: variant.variant_id,
        }))

        return (
          <CopyNumberVariants
            {...rest}
            context={gene}
            exportFileName={`gnomad_copy_number_variants_${gene.gene_id}`}
            variants={copy_number_variants}
          />
        )
      }}
    </Query>
  )
}

CopyNumberVariantsInGene.defaultProps = {
  zoomRegion: null,
}

export default CopyNumberVariantsInGene
