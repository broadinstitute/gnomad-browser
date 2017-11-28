/* eslint-disable react/prop-types */

import React from 'react'
import styled from 'styled-components'
import gql from 'graphql-tag'
import { graphql, compose } from 'react-apollo'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
`
const Cursor = styled.p`
  max-width: 500px;
  border: 1px solid #000;
  word-wrap: break-word;
`

const variantTableQuery = gql`
  query VariantTable(
    $geneName: String,
    $index: String,
    $cursor: String,
  ) {
    variantResult: pageVariants(geneId: $geneName, index: $index, cursor: $cursor) {
      variantCount
      cursor
      variants {
        id
        alleleCount
      }
    }
  }
`

const withQuery = graphql(variantTableQuery, {
  options: ({ currentGene, variantDataset }) => ({
    variables: {
      geneName: currentGene,
      index: variantDataset,
    },
    errorPolicy: 'ignore',
  }),
  props: ({
    data: {
      variantResult,
      loading,
      fetchMore,
    }
  }) => {
    return ({
      loading,
      variantResult,
      loadMoreVariants () {
        const cursor = variantResult ? variantResult.cursor : null
        return fetchMore({
          variables: {
            cursor,
          },
          updateQuery: (previousResult, { fetchMoreResult }) => {
            if (!fetchMoreResult) { return previousResult }
            return {
              ...previousResult,
              variantResult: {
                ...variantResult,
                cursor: fetchMoreResult.variantResult.cursor,
                variants: [
                  ...previousResult.variantResult.variants,
                  ...fetchMoreResult.variantResult.variants,
                ]
              }
            }
          }
        })
      }
    })
  },
})

const VariantTable = ({
  loading,
  variantResult,
  loadMoreVariants,
}) => {
  if (loading) {
    return <div>Loading</div>
  }
  if (!variantResult) {
    return <div>Variants not found.</div>
  }
  return (
    <Wrapper>
      <button
        onClick={(event) => {
          event.preventDefault()
          loadMoreVariants()
        }}
      >
        Fetch more
      </button>
      {`Total: ${variantResult.variantCount}`}
      {`Fetched: ${variantResult.variants.length}`}
      <Cursor>
        {`Cursor: ${variantResult.cursor}`}
      </Cursor>
      {variantResult.variants.map(({ id, alleleCount }) => <p key={`${id}`}>{id} {alleleCount}</p>)}
    </Wrapper>
  )
}

export default compose(
  withQuery
)(VariantTable)
