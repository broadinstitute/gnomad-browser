import React from 'react'

import { referenceGenome } from '@gnomad/dataset-metadata/metadata'
import Query from '../Query'
import { filterStructuralVariantsInZoomRegion } from '../RegionViewer/filterVariantsInZoomRegion'
import StructuralVariants from '../StructuralVariantList/StructuralVariants'

type OwnProps = {
  datasetId: string
  region: {
    chrom: string
    start: number
    stop: number
  }
  zoomRegion?: {
    start: number
    stop: number
  }
}

// @ts-expect-error TS(2456) FIXME: Type alias 'Props' circularly references itself.
type Props = OwnProps & typeof StructuralVariantsInRegion.defaultProps

// @ts-expect-error TS(7022) FIXME: 'StructuralVariantsInRegion' implicitly has type '... Remove this comment to see the full error message
const StructuralVariantsInRegion = ({ datasetId, region, zoomRegion, ...rest }: Props) => {
  const operationName = 'StructuralVariantsInRegion'
  const query = `
    query ${operationName}($datasetId: StructuralVariantDatasetId!, $chrom: String!, $start: Int!, $stop: Int!, $referenceGenome: ReferenceGenomeId!) {
      region(chrom: $chrom, start: $start, stop: $stop, reference_genome: $referenceGenome) {
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
        chrom: region.chrom,
        start: region.start,
        stop: region.stop,
        referenceGenome: referenceGenome(datasetId),
      }}
      loadingMessage="Loading variants"
      errorMessage="Unable to load variants"
      success={(data: any) => data.region && data.region.structural_variants}
    >
      {({ data }: any) => {
        const regionId = `${region.chrom}-${region.start}-${region.stop}`

        return (
          <StructuralVariants
            {...rest}
            context={region}
            exportFileName={`gnomad_structural_variants_${regionId}`}
            variants={filterStructuralVariantsInZoomRegion(
              data.region.structural_variants,
              zoomRegion
            )}
          />
        )
      }}
    </Query>
  )
}

StructuralVariantsInRegion.defaultProps = {
  zoomRegion: null,
}

export default StructuralVariantsInRegion
