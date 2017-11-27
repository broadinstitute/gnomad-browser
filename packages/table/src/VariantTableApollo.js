/* eslint-disable react/prop-types */

import React from 'react'
import styled from 'styled-components'
import gql from 'graphql-tag'
import { graphql, compose } from 'react-apollo'

const Wrapper = styled.div`

`

const variantTableQuery = gql`
  query VariantTable($geneName: String!) {
    geneData: gene(gene_name: $geneName) {
      gene_name
      gnomadExomeVariants {
        id: variant_id
        alleleFreq: allele_freq
      }
    }
  }
`

const withQuery = graphql(variantTableQuery, {
  options: ({ currentGene }) => ({
    variables: {
      geneName: currentGene
    },
    errorPolicy: 'ignore',
  })
})

const VariantTable = ({
  data: { loading, geneData },
}) => {
  if (loading) {
    return <div>Loading</div>
  }
  if (!geneData) {
    return <div>Gene not found.</div>
  }
  return (
    <Wrapper>
      {geneData.gnomadExomeVariants.map(({ id, alleleFreq }) => <p key={`${id}`}>{id} {alleleFreq}</p>)}
    </Wrapper>
  )
}

export default compose(
  withQuery
)(VariantTable)
