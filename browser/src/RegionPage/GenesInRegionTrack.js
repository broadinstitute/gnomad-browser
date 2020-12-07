import PropTypes from 'prop-types'
import React from 'react'

import { GenesTrack } from '@gnomad/track-genes'

import Query from '../Query'

const query = `
  query GenesInRegion($chrom: String!, $start: Int!, $stop: Int!, $referenceGenome: ReferenceGenomeId!) {
    region(chrom: $chrom, start: $start, stop: $stop, reference_genome: $referenceGenome) {
      genes {
        gene_id
        symbol
        start
        stop
        exons {
          feature_type
          start
          stop
        }
      }
    }
  }
`

const GenesInRegionTrack = ({ region, onClickGene }) => {
  return (
    <Query
      query={query}
      variables={{
        chrom: region.chrom,
        start: region.start,
        stop: region.stop,
        referenceGenome: region.reference_genome,
      }}
      loadingMessage="Loading genes"
      errorMessage="Unable to load genes"
      success={data => data.region && data.region.genes}
    >
      {({ data }) => {
        return (
          <GenesTrack
            genes={data.region.genes}
            includeNonCodingGenes={region.chrom === 'M'}
            onGeneClick={onClickGene}
          />
        )
      }}
    </Query>
  )
}

GenesInRegionTrack.propTypes = {
  region: PropTypes.shape({
    reference_genome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
  onClickGene: PropTypes.func.isRequired,
}

export default GenesInRegionTrack
