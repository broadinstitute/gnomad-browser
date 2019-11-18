import PropTypes from 'prop-types'
import React from 'react'

import { RegionViewer } from '..'

import Query from './Query'

const GENE_QUERY = `
  query Gene ($geneSymbol: String!) {
    gene(gene_symbol: $geneSymbol, reference_genome: GRCh37) {
      gene_name
      canonical_transcript_id
      strand
      exons {
        feature_type
        start
        stop
      }
      transcripts {
        transcript_id
        chrom
        strand
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

const GeneViewer = ({ children, geneSymbol, ...rest }) => (
  <Query query={GENE_QUERY} variables={{ geneSymbol }}>
    {({ data, error, loading }) => {
      if (loading) {
        return <p>Loading gene data</p>
      }
      if (error || !data) {
        return <p>Failed to load gene data</p>
      }

      return (
        <RegionViewer {...rest} padding={75} regions={data.gene.exons}>
          {children(data.gene)}
        </RegionViewer>
      )
    }}
  </Query>
)

GeneViewer.propTypes = {
  children: PropTypes.func.isRequired,
  geneSymbol: PropTypes.string.isRequired,
}

export default GeneViewer
