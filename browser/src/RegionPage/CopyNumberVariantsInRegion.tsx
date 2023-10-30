import React from 'react'

import { referenceGenome } from '@gnomad/dataset-metadata/metadata'
import Query from '../Query'
import { filterCopyNumberVariantsInZoomRegion } from '../RegionViewer/filterVariantsInZoomRegion'
import CopyNumberVariants from '../CopyNumberVariantList/CopyNumberVariants'
import { CopyNumberVariant } from '../CopyNumberVariantPage/CopyNumberVariantPage'

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
type Props = OwnProps & typeof CopyNumberVariantsInRegion.defaultProps

// @ts-expect-error TS(7022) FIXME: 'CopyNumberVariantsInRegion' implicitly has type '... Remove this comment to see the full error message
const CopyNumberVariantsInRegion = ({ datasetId, region, zoomRegion, ...rest }: Props) => {

  const operationName = 'CopyNumberVariantsInRegion'
  const query = `
    query ${operationName}($datasetId: CopyNumberVariantDatasetId!, $chrom: String!, $start: Int!, $stop: Int!, $referenceGenome: ReferenceGenomeId!) {
      region(chrom: $chrom, start: $start, stop: $stop, reference_genome: $referenceGenome) {
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
        chrom: region.chrom,
        start: region.start,
        stop: region.stop,
        referenceGenome: referenceGenome(datasetId),
      }}
      loadingMessage="Loading variants"
      errorMessage="Unable to load variants"
      success={(data: any) => data.region && data.region.copy_number_variants}
    >
      {({ data }: any) => {
        const regionId = `${region.chrom}-${region.start}-${region.stop}`
        const variants = filterCopyNumberVariantsInZoomRegion(
          data.region.copy_number_variants,
          zoomRegion
        ).map((variant: CopyNumberVariant) => ({
          ...variant,
          variant_id: variant.variant_id,
        }))

        return (
          <CopyNumberVariants
            {...rest}
            context={region}
            exportFileName={`gnomad_copy_number_variants_${regionId}`}
            variants={variants}
          />
        )
      }}
    </Query>
  )
}

CopyNumberVariantsInRegion.defaultProps = {
  zoomRegion: null,
}

export default CopyNumberVariantsInRegion
