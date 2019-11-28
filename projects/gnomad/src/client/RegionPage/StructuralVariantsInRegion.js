import PropTypes from 'prop-types'
import React from 'react'

import { referenceGenomeForDataset } from '../datasets'
import Query from '../Query'
import StatusMessage from '../StatusMessage'
import StructuralVariants from '../StructuralVariantList/StructuralVariants'

const StructuralVariantsInRegion = ({ datasetId, region, ...rest }) => {
  const query = `
    query StructuralVariantsInRegion($datasetId: StructuralVariantDatasetId!, $chrom: String!, $start: Int!, $stop: Int!, $referenceGenome: ReferenceGenomeId!) {
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
      query={query}
      variables={{
        datasetId,
        chrom: region.chrom,
        start: region.start,
        stop: region.stop,
        referenceGenome: referenceGenomeForDataset(datasetId),
      }}
    >
      {({ data, error, loading }) => {
        if (loading) {
          return <StatusMessage>Loading variants...</StatusMessage>
        }

        if (error || !((data || {}).region || {}).structural_variants) {
          return <StatusMessage>Failed to load variants</StatusMessage>
        }

        const regionId = `${region.chrom}-${region.start}-${region.stop}`

        return (
          <StructuralVariants
            {...rest}
            chrom={region.chrom}
            exportFileName={`gnomad_structural_variants_${regionId}`}
            variants={data.region.structural_variants}
          />
        )
      }}
    </Query>
  )
}

StructuralVariantsInRegion.propTypes = {
  datasetId: PropTypes.string.isRequired,
  region: PropTypes.shape({
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
}

export default StructuralVariantsInRegion
