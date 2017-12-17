import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { connect } from 'react-redux'
import gql from 'graphql-tag'
import { graphql, compose } from 'react-apollo'
import { singleVariantData, focusedVariant } from '@broad/redux-variants'
import { fromJS } from 'immutable'
import {
  Table,
  VerticalTextLabels,
  TableVerticalLabel,
  VerticalLabelText,
  TableRows,
  TableRow,
  TableHeader,
  TableCell,
  TableTitleColumn,
} from '@broad/ui'

const VariantContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 1000px;
  min-height: 300px;
  ${'' /* margin-left: 50px; */}
  margin-top: 30px;
`

const SideBySide = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: space-between;
  ${'' /* s: space-between; */}
`

const VariantTitle = styled.h1`

`

const VariantDetails = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  width: 1050px;
`

const VariantAttributes = styled.div`
  display: flex;
  font-size: 16px;
  flex-direction: column;
  align-items: space-between;
  margin-top: 10px;
  margin-bottom: 10px;
`

const VariantAttribute = styled.div`
  margin-bottom: 2px;
`

const schizophreniaVariantDetailQuery = gql`
  query VariantDetailTable(
    $variantQuery: String,
  ) {
    groups: schzGroups(variant_id: $variantQuery) {
      pos
      xpos
      pval
      ac_case
      contig
      beta
      variant_id
      an_ctrl
      an_case
      group
      ac_ctrl
      allele_freq
    }
  }
`

const withQuery = graphql(schizophreniaVariantDetailQuery, {
  options: ({ variant }) => {
    let variantQuery
    if (!variant) {
      variantQuery = ''
    } else {
      variantQuery = variant.variant_id
    }
    return ({
      variables: { variantQuery },
      errorPolicy: 'ignore'
    })
  },
})

const Variant = ({ variant, data: { loading, groups } }) => {
  if (!variant || loading) {
    return <VariantContainer />
  }
  console.log(groups)
  return (
    <VariantContainer>
      <VariantTitle>{variant.variant_id}</VariantTitle>
      <SideBySide>
        <VariantDetails>
          <VariantAttributes>
            <VariantAttribute>
              <strong>Consequence:</strong> {variant.consequence}
            </VariantAttribute>
            <VariantAttribute>
              <strong>MPC:</strong> {variant.mpc}
            </VariantAttribute>
            <VariantAttribute>
              <strong>CADD:</strong> {variant.cadd}
            </VariantAttribute>
            <VariantAttribute>
              <strong>Cases:</strong> {variant.ac_case} / {variant.an_case}
            </VariantAttribute>
            <VariantAttribute>
              <strong>Controls:</strong> {variant.ac_ctrl} / {variant.an_ctrl}
            </VariantAttribute>
          </VariantAttributes>
        </VariantDetails>
        <Table>
          <TableRows>
            <TableHeader>
              <TableCell width={'200px'}>Group</TableCell>
              <TableCell width={'80px'}>Cases</TableCell>
              <TableCell width={'80px'}>Controls</TableCell>
              <TableCell width={'80px'}>P-value</TableCell>
              <TableCell width={'80px'}>Beta</TableCell>
            </TableHeader>
            {fromJS(groups).map(group => (
              <TableRow>
                <TableCell width={'200px'}>{group.get('group')}</TableCell>
                <TableCell width={'80px'}>{group.get('ac_case')}</TableCell>
                <TableCell width={'80px'}>{group.get('ac_ctrl')}</TableCell>
                <TableCell width={'80px'}>{group.get('pval')}</TableCell>
                <TableCell width={'80px'}>{group.get('beta')}</TableCell>
              </TableRow>
            ))}
          </TableRows>
        </Table>
      </SideBySide>
    </VariantContainer>
  )
}
Variant.propTypes = {
  variant: PropTypes.object.isRequired,
}

export default compose(
  connect(state => ({ variant: singleVariantData(state) })),
  withQuery
)(Variant)
