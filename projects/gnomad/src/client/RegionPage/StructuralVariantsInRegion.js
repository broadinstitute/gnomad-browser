import PropTypes from 'prop-types'
import React from 'react'

import { Query } from '../Query'
import StatusMessage from '../StatusMessage'
import StructuralVariants from '../StructuralVariantList/StructuralVariants'

const StructuralVariantsInRegion = ({ region, ...rest }) => {
  const query = `
    query StructuralVariantsInRegion($chrom: String!, $start: Int!, $stop: Int!) {
      region(chrom: $chrom, start: $start, stop: $stop) {
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
    <Query
      query={query}
      variables={{ chrom: region.chrom, start: region.start, stop: region.stop }}
    >
      {({ data, error, loading }) => {
        if (loading) {
          return <StatusMessage>Loading variants...</StatusMessage>
        }

        if (error || !((data || {}).region || {}).structural_variants) {
          return <StatusMessage>Failed to load variants</StatusMessage>
        }

        return (
          <StructuralVariants
            {...rest}
            chrom={region.chrom}
            variants={data.region.structural_variants}
          />
        )
      }}
    </Query>
  )
}

StructuralVariantsInRegion.propTypes = {
  region: PropTypes.shape({
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
}

export default StructuralVariantsInRegion
