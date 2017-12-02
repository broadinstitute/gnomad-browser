/* eslint-disable react/prop-types */

import React from 'react'
import styled from 'styled-components'
import gql from 'graphql-tag'
import { connect } from 'react-redux'
import { graphql, compose } from 'react-apollo'
import {
  Map,
  List,
  fromJS,
  toJS,
} from 'immutable'

import {
  currentGene,
  currentTranscript,
} from '@broad/redux-genes'

import { Table } from './index'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
`

const PropWrapper = styled.div`

`

const Cursor = styled.p`
  max-width: 500px;
  border: 1px solid #000;
  word-wrap: break-word;
`

const variantTableQuery = gql`
  query VariantTable(
    $currentGene: String,
    $currentTranscript: String,
    $cursor: String,
    $numberOfVariants: Int,
    $consequence: String,
  ) {
    variantResult: variants(
      geneId: $currentGene,
      size: $numberOfVariants,
      cursor: $cursor,
    ) {
      count
      cursor
      variants {
        id: variantId
        variantId,
        totalCounts {
          alleleCount: AC
          alleleFrequency: AF
          homozygotes: Hom
          alleleNumber: AN
          hemizygotes: Hemi
        }
        flags {
          segdup
          lcr
        }
        mainTranscript {
          majorConsequence(string: $consequence)
          hgvsc
          hgvsp
          lof
          transcriptId
        }
        sortedTranscriptConsequences(
          transcriptId: $currentTranscript
        ) {
          majorConsequence: major_consequence
          hgvsc
          hgvsp
          lof
          transcriptId: transcript_id
        }
      }
    }
  }
`

const withQuery = graphql(variantTableQuery, {
  options: ({
    currentGene,
    numberOfVariants,
    currentTranscript,
    consequence,
  }) => ({
    variables: {
      currentGene,
      // currentTranscript,
      numberOfVariants,
      consequence,
    },
    errorPolicy: 'ignore',
  }),
  props: (props) => {
    console.log(props)
    const {
      data: {
        variantResult,
        loading,
        fetchMore,
      }
    } = props
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
  currentGene,
  currentTranscript,
  tableConfig,
}) => {
  if (loading) {
    return <div>Loading</div>
  }
  if (!variantResult) {
    return <div>Variants not found.</div>
  }
  const tConfig = tableConfig(() => {}, 500)
  const variants = variantResult.variants.map(variant => ({
    variant_id: variant.variantId,
    variantId: variant.variantId,
    datasets: [],
    flags: [],
    consequence: variant.majorConsequence,
    hgvsc: variant.mainTranscript.hgvsc,
    hgvsp: variant.mainTranscript.hgvsp,
    allele_count: variant.totalCounts.alleleCount,
    allele_um: variant.totalCounts.alleleNumber,
    allele_freq: variant.totalCounts.alleleFrequency,
    hom_count: variant.totalCounts.homozygotes,
  }))
  console.log(variants)
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
      <PropWrapper>{`Gene: ${currentGene}`}</PropWrapper>
      <PropWrapper>{`Transcript: ${currentTranscript}`}</PropWrapper>
      <PropWrapper>{`Total: ${variantResult.count}`}</PropWrapper>
      <PropWrapper>{`Fetched: ${variantResult.variants.length}`}</PropWrapper>
      <Cursor>
        {`Cursor: ${variantResult.cursor}`}
      </Cursor>
      <Table
        title={'Apollo table'}
        height={500}
        width={1000}
        tableConfig={tConfig}
        tableData={variants}
        remoteRowCount={variantResult.count}
        // loadMoreRows={loadMoreVariants}
        overscan={5}
        loadLookAhead={100}
        onRowClick={() => {}}
        onRowHover={() => {}}
        // scrollToRow={tablePosition}
        onScroll={() => {}}
        searchText={''}
        // filteredIdList={filteredIdList}
      />
    </Wrapper>
  )
}

const mapStateToProps = state => ({
  currentGene: currentGene(state),
  currentTranscript: currentTranscript(state),
})

export default compose(
  connect(mapStateToProps),
  withQuery
)(VariantTable)
