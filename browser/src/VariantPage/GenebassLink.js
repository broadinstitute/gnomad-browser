import PropTypes from 'prop-types'
import React from 'react'
// import styled from 'styled-components'

import { ExternalLink, ListItem } from '@gnomad/ui'

import Delayed from '../Delayed'
import { BaseQuery } from '../Query'

const getTopPheno = genebassVariant => {
  return genebassVariant.phenotypes.sort((a, b) => parseFloat(a.pval) - parseFloat(b.pval))[0]
    .analysis_id
}

const genebassQuery = `
query GenebassVariant($variantId: String!) {
  genebass_variant(variantId: $variantId) {
    gene_id
    phenotypes {
      pval
      beta
      analysis_id
    }
  }
}
`

const GenebassLink = ({ variantId }) => {
  return (
    <BaseQuery
      query={genebassQuery}
      variables={{
        variantId,
      }}
    >
      {({ data, error, graphQLErrors, loading }) => {
        let itemContent = null
        if (loading) {
          itemContent = <Delayed>Searching Genebass...</Delayed>
        } else if (error) {
          itemContent = 'Error searching Genebass'
        } else if (!data) {
          if (
            graphQLErrors &&
            graphQLErrors.some(err => err.message === 'Variant not found in Genebass')
          ) {
            itemContent = 'Variant not found in Genebass'
          } else {
            itemContent = (
              <>
                {graphQLErrors && graphQLErrors.length
                  ? Array.from(new Set(graphQLErrors.map(e => e.message))).join(', ')
                  : 'Unable to load variant'}
              </>
            )
          }
        } else {
          const genebassVariant = data.genebass_variant

          if (genebassVariant && genebassVariant.phenotypes) {
            itemContent = (
              <ListItem>
                <ExternalLink
                  href={`https://genebass.org/gene/${
                    genebassVariant.gene_id
                  }/phenotype/${getTopPheno(
                    genebassVariant
                  )}/variant/${variantId}?burdenSet=pLoF&phewasOpts=1&resultIndex=variant-phewas&resultLayout=half`}
                >
                  Genebass variant associations ({genebassVariant.phenotypes.length} P-values)
                </ExternalLink>
              </ListItem>
            )
          } else if (genebassVariant && genebassVariant.gene_id) {
            itemContent = (
              <ListItem>
                <ExternalLink
                  href={`https://genebass.org/gene/${genebassVariant.gene_id}/phenotype/continuous-30690-both_sexes--irnt/variant/${variantId}?resultIndex=variant-phewas&resultLayout=hidden`}
                >
                  Genebass variant found but no associations
                </ExternalLink>
              </ListItem>
            )
          } else {
            itemContent = <ListItem>Variant not found in Genebass</ListItem>
          }
        }

        return <React.Fragment>{itemContent}</React.Fragment>
      }}
    </BaseQuery>
  )
}

GenebassLink.propTypes = {
  variantId: PropTypes.string.isRequired,
}

export default GenebassLink
